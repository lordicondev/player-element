import type { CompleteDetail, IconState, Player, PlayOptions } from '@lordicon/web';
import { createPlayer } from '../player/factory.ts';
import { syncPalette } from '../player/palette.ts';
import { parseColors, parseStroke } from '../player/parsers.ts';
import { loadIcon } from '../player/source.ts';
import { applyStyles } from '../player/styles.ts';
import { TriggerHost } from '../triggers/host.ts';
import type { Command, Trigger, TriggerConstructor } from '../triggers/types.ts';
import type { IconData, LordIconEventMap, MotionMode, PlayerFactory } from '../types.ts';
import {
    OBSERVED,
    parseLoading,
    parseMotion,
    parseSpeed,
    type ObservedAttribute,
} from './attributes.ts';
import { abortable } from './abortable.ts';
import { Deferred } from './deferred.ts';
import { Internals } from './internals.ts';
import { parseIntro, playIntro, type Intro } from './intro.ts';
import { waitForLoad, type Interaction } from './loading/index.ts';
import { onMotionChange, reducedMotion } from './motion.ts';
import { CommandQueue } from './queue.ts';
import { findTarget } from './target.ts';

/** Registered triggers, shared by every tag the element is defined under. */
const triggers = new Map<string, TriggerConstructor>();

/** Properties a page may set before the element is defined; see `#upgradeProperties()`. */
const PROPERTIES = [
    'icon',
    'src',
    'state',
    'trigger',
    'target',
    'colors',
    'stroke',
    'speed',
    'currentColor',
] as const;

/**
 * `HTMLElement`, or a stand-in where there is none (a server rendering the page), so that
 * importing the module there does not throw. `defineElement()` does nothing there.
 */
const Base = globalThis.HTMLElement ?? (class {} as unknown as typeof HTMLElement);

/**
 * `<lord-icon>`: an animated Lordicon icon driven by attributes.
 *
 *     <lord-icon src="icons/lock.json" trigger="hover" state="hover-swing"></lord-icon>
 *
 * The icon is loaded when the element is connected. `ready` fires once it can be played;
 * commands issued before that are queued. Triggers are registered with `defineTrigger()`.
 */
export class LordIconElement extends Base {
    static get version(): string {
        return __BUILD_VERSION__;
    }

    /** Creates the player for every icon. Tests replace it with a stub. */
    static playerFactory: PlayerFactory = createPlayer;

    /** Reduced-motion handling for every icon; the `motion` attribute overrides it per icon. */
    static motion: MotionMode = 'auto';

    static defineTrigger(name: string, trigger: TriggerConstructor): void {
        triggers.set(name.toLowerCase(), trigger);
    }

    static resolveTrigger(name: string): TriggerConstructor | undefined {
        return triggers.get(name.toLowerCase());
    }

    static get observedAttributes(): readonly string[] {
        return OBSERVED;
    }

    #container: HTMLElement | null = null;
    #slot: HTMLSlotElement | null = null;

    #assignedIcon: IconData | undefined;
    #loadedIcon: IconData | undefined;
    /** The target given as an element; a `target` attribute set later wins over it. */
    #targetElement: HTMLElement | null = null;

    #player: Player | null = null;
    #loading: AbortController | null = null;
    #intro: AbortController | null = null;
    /** The intro the icon is waiting to play; the player already rests on its first frame. */
    #pendingIntro: Intro | null = null;
    #ready = false;
    /** The wait for the `loading` strategy, while it lasts; `load()` cuts it short. */
    #waiting: AbortController | null = null;
    /** The target the wait listens on, for `loading="interaction"`; null for the others. */
    #waitingTarget: HTMLElement | null = null;
    /** Off the page, with the unload a microtask away: back by then, the element was moved. */
    #moving = false;
    /** `load()` came before the element could load: the next load does not wait. */
    #eager = false;
    #deferred = new Deferred<boolean>();
    #queue = new CommandQueue();
    #host = new TriggerHost(this, (on) => {
        this.#triggerAnimating = on;
        this.#syncPlaying();
    });
    #internals = new Internals(this);
    /** `:state(playing)`: the player plays, or the trigger says the icon animates. */
    #playerPlaying = false;
    #triggerAnimating = false;

    // Typed events

    addEventListener<K extends keyof LordIconEventMap>(
        type: K,
        listener: (this: LordIconElement, event: LordIconEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        super.addEventListener(type, listener, options);
    }

    removeEventListener<K extends keyof LordIconEventMap>(
        type: K,
        listener: (this: LordIconElement, event: LordIconEventMap[K]) => void,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void {
        super.removeEventListener(type, listener, options);
    }

    // Lifecycle

    connectedCallback(): void {
        if (!this.#container) {
            this.#createShadow();
            this.#upgradeProperties();
        }

        if (this.#moving) {
            // Moved: nothing reloads, but the target may have changed.
            this.#moving = false;
            this.#retarget();
        } else if (!this.#loading) {
            // A property set before the element was defined may have started loading already.
            this.#load();
        }
    }

    /**
     * A property set on the element before it was defined (by a framework, or a script that
     * ran first) sits on the element itself and hides the class's setter. Removing it and
     * setting it again goes through the setter.
     */
    #upgradeProperties(): void {
        const self = this as unknown as Record<string, unknown>;
        for (const name of PROPERTIES) {
            if (!Object.hasOwn(this, name)) continue;
            const value = self[name];
            delete self[name];
            self[name] = value;
        }
    }

    /**
     * Unloads the icon a microtask later: an element moved to another place on the page (by a
     * framework reordering a list, say) is back by then, and goes on as it was.
     */
    disconnectedCallback(): void {
        this.#moving = true;
        queueMicrotask(() => {
            if (this.#moving) this.#leave();
        });
    }

    /** Off the page for good: unloads, and the icon is not ready, whatever it was before. */
    #leave(): void {
        this.#moving = false;
        this.#unload();
        if (this.#deferred.settled) this.#deferred = new Deferred<boolean>();
        this.#deferred.resolve(false);
    }

    /**
     * The target may be another element now: after `target` changed, or the element moved.
     * A running trigger then starts over on it; a wait for an interaction on the old one
     * starts loading over.
     */
    #retarget(): void {
        if (!this.isConnected) return;
        const target = this.#target();

        if (this.#waiting) {
            if (this.#waitingTarget && this.#waitingTarget !== target) this.#load();
        } else if (this.#player && this.#host.active && this.#host.target !== target) {
            this.#startTrigger(this.#player);
        }
    }

    /** `src` or `icon` changed: loads again on the page; off it, a pending move is over. */
    #reload(): void {
        if (this.isConnected) this.#load();
        else if (this.#moving) this.#leave();
    }

    attributeChangedCallback(
        name: ObservedAttribute,
        before: string | null,
        after: string | null,
    ): void {
        if (before === after) return;

        switch (name) {
            case 'src':
                this.#reload();
                break;
            case 'state':
                if (!this.#player) break;
                warnUnknownState(this.#player, after);
                // During an intro the new state waits: the intro ends on it.
                if (!this.#pendingIntro) this.#player.state = after;
                this.#host.onState();
                this.dispatchEvent(new CustomEvent('state', { detail: after }));
                break;
            case 'colors':
                if (this.#player) this.#player.colors = parseColors(after);
                break;
            case 'stroke':
                if (this.#player) this.#player.stroke = parseStroke(after);
                break;
            case 'speed':
                if (this.#player) this.#player.speed = parseSpeed(after);
                break;
            case 'trigger':
                // Before ready (or during the intro) the trigger starts once that is over.
                if (this.#ready && this.#player && !this.#intro) this.#startTrigger(this.#player);
                break;
            case 'target':
                if (after !== null) this.#targetElement = null;
                this.#retarget();
                break;
            case 'intro':
            case 'loading':
            case 'motion':
                // Read when the icon loads: once it has started, a change waits for the next.
                if (this.#loading) {
                    console.warn(
                        `lord-icon: "${name}" changed after the icon started loading; it applies from the next load`,
                    );
                }
                break;
            case 'aria-label':
            case 'aria-labelledby':
                this.#internals.named(
                    !!this.getAttribute('aria-label')?.trim() ||
                        this.hasAttribute('aria-labelledby'),
                );
                break;
        }
    }

    #createShadow(): void {
        const root = this.attachShadow({ mode: 'open' });
        applyStyles(root);

        this.#container = document.createElement('div');
        // The element itself is the image, or is hidden; see `Internals.named()`.
        this.#container.setAttribute('aria-hidden', 'true');
        root.append(this.#container);
        this.#showPlaceholder(true);
    }

    /** The light DOM shows through a slot until the icon is ready. */
    #showPlaceholder(show: boolean): void {
        if (show && !this.#slot) {
            this.#slot = document.createElement('slot');
            this.shadowRoot!.append(this.#slot);
        } else if (!show && this.#slot) {
            this.#slot.remove();
            this.#slot = null;
        }
    }

    // Loading

    async #load(): Promise<void> {
        this.#unload();

        const controller = new AbortController();
        const { signal } = controller;
        this.#loading = controller;
        // A pending readyPromise carries over to the new icon; a settled one is replaced.
        if (this.#deferred.settled) this.#deferred = new Deferred<boolean>();

        let interaction: Interaction | null = null;
        try {
            interaction = await this.#waitForLoading(signal);

            this.#internals.phase('loading');
            const data =
                this.#assignedIcon ?? (this.src ? await this.loadIcon(this.src, signal) : null);
            if (signal.aborted) return;
            if (!data) {
                this.#internals.phase(null);
                return; // nothing to show yet; the placeholder stays
            }

            this.#loadedIcon = this.#assignedIcon ? undefined : data;
            const player = this.#createPlayer(data, signal);

            const ready = await abortable(player.readyPromise, signal);
            if (signal.aborted || !ready) return;

            // Commands issued before ready take over: no intro, and the icon's own state.
            let intro = this.#pendingIntro;
            if (intro && this.#queue.size > 0) {
                intro = this.#pendingIntro = null;
                player.state = this.state;
            }

            // The intro counts as started before `ready`: a command from a listener cuts it
            // short, and a new trigger waits for it.
            const introControl = intro ? this.#beginIntro(signal) : null;

            this.#showPlaceholder(false);
            this.#ready = true;
            this.#internals.phase('ready');
            this.#queue.flush(player);
            this.dispatchEvent(new CustomEvent('ready'));
            // A listener may have replaced the icon: readyPromise then waits for the new one.
            if (signal.aborted) return;
            this.#deferred.resolve(true);

            if (intro && introControl && !introControl.signal.aborted) {
                await this.#playIntro(player, intro, introControl);
            }
            if (signal.aborted) return;

            if (!this.#host.active) this.#startTrigger(player, interaction);
            onMotionChange(() => this.#startTrigger(player), signal);

            // What happened on the target while the icon loaded came before the trigger
            // existed: it goes to the trigger alone, since the page has seen those events.
            for (const event of interaction?.end() ?? []) this.#host.onInteraction(event);
        } catch (error) {
            if (signal.aborted) return;

            const reason = error instanceof Error ? error : new Error(String(error));
            this.#internals.phase('error');
            this.dispatchEvent(new CustomEvent('error', { detail: reason }));
            this.#deferred.reject(reason);
        } finally {
            interaction?.end();
        }
    }

    /**
     * Waits for the moment the `loading` attribute asks for, unless `load()` says not to. Gives
     * the interaction that ended an `interaction` wait, still listening; null otherwise, and
     * when `load()` cut the wait short. Rejects when the element unloads.
     */
    async #waitForLoading(signal: AbortSignal): Promise<Interaction | null> {
        if (this.#eager) {
            this.#eager = false;
            return null;
        }

        const waiting = new AbortController();
        const unload = () => waiting.abort(signal.reason);
        signal.addEventListener('abort', unload, { once: true });
        const strategy = parseLoading(this.getAttribute('loading'));
        const target = this.#target();
        if (strategy.kind !== 'eager') this.#internals.phase('waiting');
        this.#waiting = waiting;
        this.#waitingTarget = strategy.kind === 'interaction' ? target : null;

        try {
            return await waitForLoad(strategy, this, target, waiting.signal);
        } catch (error) {
            if (signal.aborted) throw error;
            return null; // load() cut it short
        } finally {
            signal.removeEventListener('abort', unload);
            if (this.#waiting === waiting) {
                this.#waiting = null;
                this.#waitingTarget = null;
            }
        }
    }

    /** Marks the intro as under way; unloading the icon cancels it. */
    #beginIntro(signal: AbortSignal): AbortController {
        const controller = new AbortController();
        this.#intro = controller;
        this.#internals.intro(true);
        signal.addEventListener('abort', () => controller.abort(), { once: true });
        return controller;
    }

    /** Plays the intro. A command cancels it, which starts the trigger at once. */
    async #playIntro(player: Player, intro: Intro, controller: AbortController): Promise<void> {
        try {
            await playIntro(this, player, intro, controller.signal);
        } catch (error) {
            if (!controller.signal.aborted) throw error;
        } finally {
            if (this.#intro === controller) {
                this.#intro = null;
                this.#pendingIntro = null;
                this.#internals.intro(false);
            }
        }
    }

    /** Cancels an intro in progress and hands the icon to its trigger. */
    #cancelIntro(player: Player): void {
        if (!this.#intro) return;

        this.#intro.abort();
        this.#intro = null;
        this.#pendingIntro = null;
        this.#internals.intro(false);
        player.state = this.state;
        this.#startTrigger(player);
    }

    /** Starts the trigger; the first one after a load learns the interaction that caused it. */
    #startTrigger(player: Player, interaction: Interaction | null = null): void {
        this.#host.start(player, this.#target(), this.#reducedMotion(), interaction?.attributes);
        this.dispatchEvent(new CustomEvent('trigger', { detail: this.#host.current }));
    }

    #createPlayer(data: IconData, signal: AbortSignal): Player {
        const container = this.#container!;
        const factory = (this.constructor as typeof LordIconElement).playerFactory;
        const player = factory(container, data, {
            state: this.state ?? undefined,
            colors: parseColors(this.colors) ?? undefined,
            stroke: parseStroke(this.stroke) ?? undefined,
        });
        this.#player = player;
        warnUnknownState(player, this.state);

        applyStyles(this.shadowRoot!, Object.keys(player.colors ?? {}));

        const sync = () => syncPalette(container, player.colors);
        player.addEventListener('ready', sync, { signal });
        player.addEventListener('refresh', sync, { signal });
        player.addEventListener('complete', (event) => this.#onComplete(event.detail), { signal });
        player.addEventListener('frame', () => this.#host.onFrame(), { signal });
        const playing = (on: boolean) => () => {
            this.#playerPlaying = on;
            this.#syncPlaying();
        };
        player.addEventListener('play', playing(true), { signal });
        player.addEventListener('pause', playing(false), { signal });

        // An icon with an intro waits on the intro's first frame, so the first frame drawn is
        // never the resting look it is about to leave.
        this.#pendingIntro =
            this.#queue.size > 0 || this.#reducedMotion()
                ? null
                : parseIntro(
                      this.getAttribute('intro'),
                      player.states.map((state) => state.name),
                  );
        if (this.#pendingIntro) player.state = this.#pendingIntro.state;

        player.speed = this.speed;
        player.init();

        return player;
    }

    #syncPlaying(): void {
        this.#internals.playing(this.#playerPlaying || this.#triggerAnimating);
    }

    #onComplete(detail: CompleteDetail): void {
        this.#host.onComplete();
        this.dispatchEvent(new CustomEvent('complete', { detail }));
    }

    /** Stops loading, tears the trigger and the player down and shows the placeholder again. */
    #unload(): void {
        this.#loading?.abort();
        this.#loading = null;
        this.#intro = null;
        this.#pendingIntro = null;
        const hadTrigger = this.#host.active;
        this.#host.stop();
        this.#queue.clear();
        this.#ready = false;
        this.#internals.phase(null);
        this.#internals.intro(false);
        this.#playerPlaying = false;
        this.#syncPlaying();

        this.#player?.destroy();
        this.#player = null;
        this.#loadedIcon = undefined;

        if (this.shadowRoot) applyStyles(this.shadowRoot);
        if (this.#container) this.#showPlaceholder(true);
        // The trigger went with the icon: `currentTrigger` is null now.
        if (hadTrigger) this.dispatchEvent(new CustomEvent('trigger', { detail: null }));
    }

    /** The target given as an element, the element a `target` selector names, or the icon. */
    #target(): HTMLElement {
        if (this.#targetElement) return this.#targetElement;
        const selector = this.getAttribute('target');
        return (selector && findTarget(this, selector)) || this;
    }

    #reducedMotion(): boolean {
        const globalMode = (this.constructor as typeof LordIconElement).motion;
        return reducedMotion(parseMotion(this.getAttribute('motion')), globalMode);
    }

    /**
     * Loads the icon at `src`: fetches it as Lottie JSON. A subclass can load some icons another
     * way, encrypted ones say, and leave the rest to this one:
     *
     *     class SecretIcon extends LordIconElement {
     *         protected async loadIcon(src: string, signal: AbortSignal): Promise<IconData> {
     *             if (!src.endsWith('.enc')) return super.loadIcon(src, signal);
     *             const response = await fetch(src, { signal });
     *             return decrypt(await response.text());
     *         }
     *     }
     *     defineElement({ element: SecretIcon });
     *
     * A rejection shows as the `error` event; `signal` aborts when the icon is no longer wanted.
     */
    protected loadIcon(src: string, signal: AbortSignal): Promise<IconData> {
        return loadIcon(src, signal);
    }

    // Playback

    /**
     * Runs a command on the player now, or once the icon is ready. Once ready, the trigger may
     * take it over (`onCommand`). Resolves with what the command gives, or with `dropped` when
     * the icon is unloaded before it was ready.
     */
    #run<T>(command: Command, perform: (player: Player) => T | Promise<T>, dropped: T): Promise<T> {
        const player = this.#player;
        if (this.#ready && player) {
            this.#cancelIntro(player);
            const taken = this.#host.onCommand(command);
            // Only play() gives a value; a taken pause, stop or seek resolves with nothing.
            if (taken !== undefined) return Promise.resolve(taken as T);
            return Promise.resolve(perform(player));
        }

        return new Promise((resolve) => {
            this.#queue.push({
                run: (ready) => resolve(perform(ready)),
                drop: () => resolve(dropped),
            });
        });
    }

    /**
     * Loads the icon now, whatever its `loading` attribute waits for, and gives `readyPromise`.
     * Does nothing more when the icon is loading or ready already. On an element not on the page
     * yet, the icon loads as soon as it is added.
     */
    load(): Promise<boolean> {
        if (this.#waiting) this.#waiting.abort();
        else if (!this.#loading) this.#eager = true;

        return this.readyPromise;
    }

    /**
     * Plays, as the player's `play()` does: no options resumes (or starts over after the
     * end), `{ state }`, `{ segment }`, `{ from: 'start' }` and `{ reverse }` choose what.
     * Resolves `true` when it plays to the end, `false` when something cuts it short, also
     * when the icon is unloaded before it was ready.
     */
    play(options: PlayOptions = {}): Promise<boolean> {
        return this.#run(
            { name: 'play', options },
            (player) => {
                warnUnknownState(player, options.state);
                return player.play(options);
            },
            false,
        );
    }

    pause(): void {
        void this.#run({ name: 'pause' }, (player) => player.pause(), undefined);
    }

    /** Pauses on the first frame. */
    stop(): void {
        void this.#run({ name: 'stop' }, (player) => player.stop(), undefined);
    }

    /** Shows a frame (absolute, or `'start'` / `'end'`) and pauses. */
    seek(frame: number | 'start' | 'end'): void {
        void this.#run({ name: 'seek', frame }, (player) => player.seek(frame), undefined);
    }

    // Properties

    /** The icon as Lottie JSON. Assigning it replaces `src`. */
    get icon(): IconData | undefined {
        return this.#assignedIcon ?? this.#loadedIcon;
    }

    set icon(value: IconData | undefined) {
        if (value === this.#assignedIcon) return;
        this.#assignedIcon = value;
        this.#reload();
    }

    get src(): string | null {
        return this.getAttribute('src');
    }

    set src(value: string | null | undefined) {
        this.#reflect('src', value);
    }

    get state(): string | null {
        return this.getAttribute('state');
    }

    set state(value: string | null | undefined) {
        this.#reflect('state', value);
    }

    get trigger(): string | null {
        return this.getAttribute('trigger');
    }

    set trigger(value: string | null | undefined) {
        this.#reflect('trigger', value);
    }

    /**
     * What the trigger follows: a selector of an ancestor, as the attribute has it, or any
     * element, given here. Setting the attribute later replaces the element.
     */
    get target(): string | HTMLElement | null {
        return this.#targetElement ?? this.getAttribute('target');
    }

    set target(value: string | HTMLElement | null | undefined) {
        if (typeof value === 'object' && value !== null) {
            this.#targetElement = value;
            if (this.hasAttribute('target')) this.removeAttribute('target');
            else this.#retarget();
        } else {
            this.#targetElement = null;
            if ((value ?? null) === this.getAttribute('target')) this.#retarget();
            else this.#reflect('target', value);
        }
    }

    get colors(): string | null {
        return this.getAttribute('colors');
    }

    set colors(value: string | null | undefined) {
        this.#reflect('colors', value);
    }

    get stroke(): string | null {
        return this.getAttribute('stroke');
    }

    set stroke(value: string | null | undefined) {
        this.#reflect('stroke', value);
    }

    get speed(): number {
        return parseSpeed(this.getAttribute('speed'));
    }

    set speed(value: number | null | undefined) {
        this.#reflect('speed', value == null ? null : String(value));
    }

    get currentColor(): boolean {
        return this.hasAttribute('current-color');
    }

    set currentColor(value: boolean | null | undefined) {
        this.toggleAttribute('current-color', !!value);
    }

    /** Sets an attribute; `null` and `undefined` remove it. */
    #reflect(name: string, value: string | null | undefined): void {
        if (value == null) this.removeAttribute(name);
        else this.setAttribute(name, value);
    }

    /** True once the icon can be played. */
    get ready(): boolean {
        return this.#ready;
    }

    /**
     * Resolves `true` when the icon is ready, `false` when the element leaves the page first.
     * Rejects when loading fails.
     */
    get readyPromise(): Promise<boolean> {
        return this.#deferred.promise;
    }

    /** The trigger running the icon, as `trigger` names it; null before ready and without one. */
    get currentTrigger(): Trigger | null {
        return this.#host.current;
    }

    /** The player behind the icon, once it exists. */
    get player(): Player | null {
        return this.#player;
    }

    /** The icon's states, as the player reads them. Empty before the icon is loaded. */
    get states(): IconState[] {
        return this.#player?.states ?? [];
    }
}

/** A state the icon does not have plays the default one: worth a word to the developer. */
function warnUnknownState(player: Player, name: string | null | undefined): void {
    if (name == null || name === '*') return;
    if (player.states.some((state) => state.name === name)) return;
    console.warn(`lord-icon: the icon has no state "${name}"; the default one plays`);
}
