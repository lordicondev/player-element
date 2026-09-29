import type { Player } from '@lordicon/web';
import type { LordIconElement } from '../element/element.ts';
import { parseTrigger, type TriggerSpec } from './params.ts';
import type { Command, Trigger, TriggerConstructor } from './types.ts';

/**
 * Runs the trigger named in the element's `trigger` attribute: creates it with its context,
 * forwards the player's events to it, and tears it down with an AbortSignal.
 */
export class TriggerHost {
    #element: LordIconElement;
    #onAnimating: (on: boolean) => void;
    #trigger: Trigger | null = null;
    #target: HTMLElement | null = null;
    #controller: AbortController | null = null;

    /** `onAnimating` hears what the running trigger says of its own playback. */
    constructor(element: LordIconElement, onAnimating: (on: boolean) => void = () => {}) {
        this.#element = element;
        this.#onAnimating = onAnimating;
    }

    get active(): boolean {
        return this.#trigger !== null;
    }

    /** The running trigger, or null. */
    get current(): Trigger | null {
        return this.#trigger;
    }

    /** The element the running trigger follows, or null. */
    get target(): HTMLElement | null {
        return this.#target;
    }

    /**
     * Creates the trigger for a player, following `target`. Calls `onReady` at once when the
     * player already is. `attributes` are the target's before the interaction that loaded the
     * icon, if one did.
     */
    start(
        player: Player,
        target: HTMLElement,
        reducedMotion: boolean,
        attributes?: ReadonlyMap<string, string>,
    ): void {
        this.stop();

        const element = this.#element;
        const spec = parseTrigger(element.getAttribute('trigger'));
        if (!spec) return;

        const Ctor = (element.constructor as typeof LordIconElement).resolveTrigger(spec.name);
        if (!Ctor) {
            console.warn(`lord-icon: unknown trigger "${spec.name}"`);
            return;
        }

        const options = withPrimary(spec, Ctor);
        this.#target = target;
        const controller = new AbortController();
        this.#controller = controller;
        this.#trigger = new Ctor({
            player,
            element,
            target,
            signal: controller.signal,
            options,
            reducedMotion,
            ...(attributes ? { interaction: { attributes } } : {}),
            // A trigger torn down has no say any more.
            setAnimating: (on) => {
                if (!controller.signal.aborted) this.#onAnimating(on);
            },
        });

        if (player.ready) this.#trigger.onReady?.();
    }

    /** Tears the trigger down. Safe to call when there is none. */
    stop(): void {
        if (this.#controller) this.#onAnimating(false);
        this.#controller?.abort();
        this.#controller = null;
        this.#trigger = null;
        this.#target = null;
    }

    onComplete(): void {
        this.#trigger?.onComplete?.();
    }

    onState(): void {
        this.#trigger?.onState?.();
    }

    onFrame(): void {
        this.#trigger?.onFrame?.();
    }

    onInteraction(event: Event): void {
        this.#trigger?.onInteraction?.(event);
    }

    /** What the trigger takes a command over with, or undefined when it lets it through. */
    onCommand(command: Command): true | Promise<boolean> | undefined {
        const taken = this.#trigger?.onCommand?.(command);
        return taken === true || taken instanceof Promise ? taken : undefined;
    }
}

/** The options with the unnamed value filed under the trigger's `primary` option. */
function withPrimary(spec: TriggerSpec, Ctor: TriggerConstructor): Record<string, string> {
    const { name, primary, options } = spec;
    if (primary === undefined) return options;

    const key = Ctor.primary;
    if (!key) {
        console.warn(`lord-icon: trigger "${name}" takes no value without a name`);
        return options;
    }

    if (key in options) {
        console.warn(`lord-icon: trigger "${name}" got ${key} twice; the named one wins`);
        return options;
    }

    return { ...options, [key]: primary };
}
