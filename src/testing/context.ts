import { defineElement } from '../index.ts';
import type { TriggerContext } from '../triggers/types.ts';
import { playerStub, type StubOptions, type StubPlayer } from './player-stub.ts';

/** Defines `lord-icon` with the built-in triggers, once. */
export function defineForTests(): void {
    defineElement();
}

export type ContextOptions = StubOptions & {
    options?: Record<string, string>;
    reducedMotion?: boolean;
    /** Attributes set on the target before the trigger is created. */
    target?: Record<string, string>;
    /** The target's attributes before the interaction that loaded the icon. */
    interaction?: Record<string, string>;
};

/** A trigger context around a stub player, plus the controller that tears it down. */
export function makeContext(options: ContextOptions = {}) {
    defineForTests();

    const element = document.createElement('lord-icon');
    const target = document.createElement('button');
    for (const [name, value] of Object.entries(options.target ?? {})) {
        target.setAttribute(name, value);
    }
    target.append(element);
    document.body.append(target);

    const player = playerStub(options) as StubPlayer;
    const controller = new AbortController();
    const context: TriggerContext = {
        player,
        element,
        target,
        signal: controller.signal,
        options: options.options ?? {},
        reducedMotion: options.reducedMotion ?? false,
        setAnimating: () => {},
        ...(options.interaction
            ? { interaction: { attributes: new Map(Object.entries(options.interaction)) } }
            : {}),
    };

    /** Marks the player ready and calls the trigger's onReady. */
    const ready = (trigger: { onReady?: () => void }) => {
        player.ready = true;
        trigger.onReady?.();
    };

    /** Attribute changes reach a MutationObserver a microtask later. */
    const set = async (name: string, value: string) => {
        target.setAttribute(name, value);
        await Promise.resolve();
    };

    return { context, player, element, target, controller, ready, set };
}
