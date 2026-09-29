import type { Player } from '@lordicon/web';
import type { LordIconElement } from '../element/element.ts';
import type { Command, Trigger, TriggerContext } from './types.ts';

/**
 * What a trigger starts from. Set up in the constructor; everything registered through
 * `listen`, `watch` and `timeout` stops when the trigger is torn down.
 *
 *     class Wobble extends BaseTrigger {
 *         constructor(context: TriggerContext) {
 *             super(context);
 *             this.listen(this.target, 'click', () => this.player.play({ from: 'start' }));
 *         }
 *     }
 *     LordIconElement.defineTrigger('wobble', Wobble);
 */
export abstract class BaseTrigger implements Trigger {
    // Declared here so every subclass is a Trigger for TypeScript, even with no hooks.
    onReady?(): void;
    onComplete?(): void;
    onState?(): void;
    onFrame?(): void;

    protected player: Player;
    protected element: LordIconElement;
    protected target: HTMLElement;
    protected signal: AbortSignal;
    protected options: Record<string, string>;
    protected reducedMotion: boolean;
    protected interaction: TriggerContext['interaction'];
    #context: TriggerContext;

    /** What `listen` added on the target, for `onInteraction`. */
    #targetListeners: { type: string; listener: (event: Event) => void }[] = [];
    /** Timeouts not yet run. */
    #timers = new Set<Timer>();
    /** Set by the element's `pause()` while a timeout waited; they wait with the player. */
    #frozen = false;

    constructor(context: TriggerContext) {
        this.player = context.player;
        this.element = context.element;
        this.target = context.target;
        this.signal = context.signal;
        this.options = context.options;
        this.reducedMotion = context.reducedMotion;
        this.interaction = context.interaction;
        this.#context = context;

        // One handler for every timeout: one per timeout would pile up on a looping icon.
        this.signal.addEventListener(
            'abort',
            () => {
                for (const timer of this.#timers) if (timer.id !== null) clearTimeout(timer.id);
                this.#timers.clear();
            },
            { once: true },
        );
    }

    /** An option from the `trigger` attribute, or the fallback. */
    protected option(name: string): string | undefined;
    protected option(name: string, fallback: string): string;
    protected option(name: string, fallback?: string): string | undefined {
        return this.options[name] ?? fallback;
    }

    /** A numeric option, or the fallback when missing or not a number. */
    protected number(name: string, fallback: number): number {
        const value = Number(this.options[name]);
        return Number.isFinite(value) ? value : fallback;
    }

    /** The `ratio` option, where a morph splits; undefined when missing or not a number. */
    protected ratio(): number | undefined {
        const value = Number(this.options.ratio);
        return this.options.ratio && Number.isFinite(value) ? value : undefined;
    }

    /** Adds an event listener that is removed at teardown. */
    protected listen<K extends keyof HTMLElementEventMap>(
        element: EventTarget,
        type: K,
        listener: (event: HTMLElementEventMap[K]) => void,
        options?: AddEventListenerOptions,
    ): void {
        element.addEventListener(type, listener as EventListener, {
            ...options,
            signal: this.signal,
        });

        if (element === this.target) {
            this.#targetListeners.push({ type, listener: listener as (event: Event) => void });
        }
    }

    /**
     * Hands the interaction that loaded the icon to what this trigger listens for on the
     * target, as if it had been there to hear it.
     */
    onInteraction(event: Event): void {
        for (const { type, listener } of this.#targetListeners) {
            if (type === event.type && !this.signal.aborted) listener.call(this.target, event);
        }
    }

    /**
     * An attribute of the target as the trigger starts from it: as it was before the
     * interaction that loaded the icon, when one did; as it is now otherwise.
     */
    protected startingAttribute(name: string): string | null {
        const before = this.interaction?.attributes;
        return before ? (before.get(name) ?? null) : this.target.getAttribute(name);
    }

    /**
     * For a trigger that plays the icon its own way (a clock of its own, seeking the player):
     * whether the icon animates now, for the element's `:state(playing)`.
     */
    protected setAnimating(on: boolean): void {
        this.#context.setAnimating(on);
    }

    /** Calls `onChange` whenever `attribute` changes on `element`, until teardown. */
    protected watch(element: Element, attribute: string, onChange: () => void): void {
        const observer = new MutationObserver(onChange);
        observer.observe(element, { attributes: true, attributeFilter: [attribute] });
        this.signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    }

    /**
     * A timeout that is cleared at teardown. Returns a function that cancels it early. The
     * element's `pause()` holds it and `play()` lets it run out, so a paused icon stays paused
     * through a delay.
     */
    protected timeout(callback: () => void, ms: number): () => void {
        const timer: Timer = { callback, remaining: ms, started: 0, id: null };
        this.#timers.add(timer);
        if (!this.#frozen) this.#start(timer);

        return () => {
            if (timer.id !== null) clearTimeout(timer.id);
            this.#timers.delete(timer);
        };
    }

    /**
     * Holds the timeouts on the element's `pause()`, and lets them go on `play()`; `play()`
     * then goes no further, so the player does not start over the look it waits on. Any other
     * command lets them go too, and goes on to the player. A trigger with commands of its
     * own replaces this.
     */
    onCommand(command: Command): boolean | Promise<boolean> | void {
        if (command.name === 'pause') {
            if (this.#timers.size && !this.#frozen) this.#freeze();
            return;
        }

        if (!this.#frozen) return;
        this.#thaw();
        const bare =
            command.name === 'play' && Object.values(command.options).every((v) => v === undefined);
        if (bare) return true;
    }

    #start(timer: Timer): void {
        timer.started = performance.now();
        timer.id = setTimeout(() => {
            this.#timers.delete(timer);
            timer.callback();
        }, timer.remaining);
    }

    #freeze(): void {
        this.#frozen = true;
        const now = performance.now();
        for (const timer of this.#timers) {
            if (timer.id === null) continue;
            clearTimeout(timer.id);
            timer.id = null;
            timer.remaining = Math.max(timer.remaining - (now - timer.started), 0);
        }
    }

    #thaw(): void {
        this.#frozen = false;
        for (const timer of this.#timers) this.#start(timer);
    }
}

type Timer = {
    callback: () => void;
    /** Milliseconds left when it last started. */
    remaining: number;
    started: number;
    id: ReturnType<typeof setTimeout> | null;
};
