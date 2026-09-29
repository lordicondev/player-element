import type { Player, PlayOptions } from '@lordicon/web';
import type { LordIconElement } from '../element/element.ts';

/** What a trigger is given when the element creates it. */
export interface TriggerContext {
    /** The animation player. Ready by the time `onReady` is called. */
    player: Player;
    /** The `<lord-icon>` element. */
    element: LordIconElement;
    /** The element whose events and attributes the trigger follows: `target`, or the icon itself. */
    target: HTMLElement;
    /** Aborted when the trigger is torn down. Pass it to listeners and observers. */
    signal: AbortSignal;
    /** Options from the `trigger` attribute: `loop(delay=1000)` and `loop(1000)` give `{ delay: '1000' }`. */
    options: Record<string, string>;
    /** True when the viewer asked for less motion and the element respects that. */
    reducedMotion: boolean;
    /**
     * With `loading="interaction"`, for the trigger that starts once the icon has loaded: the
     * target's attributes as they were before the page heard the interaction that loaded it.
     * A trigger that follows an attribute starts from there, and animates a change made while
     * the icon loaded.
     */
    interaction?: { attributes: ReadonlyMap<string, string> };
    /**
     * For a trigger that plays the icon its own way, not through the player's `play()`: tells
     * the element whether the icon animates now, for `:state(playing)`. Cleared when the
     * trigger is torn down.
     */
    setAnimating(on: boolean): void;
}

/** Hooks the element calls on a trigger. All optional. */
export interface Trigger {
    /** The player is ready. Attribute changes before this are not lost: read the state here. */
    onReady?(): void;
    /** The player finished the current segment. */
    onComplete?(): void;
    /** The element's `state` attribute changed. */
    onState?(): void;
    /** The player rendered a frame. */
    onFrame?(): void;
    /**
     * What happened on the target while the icon loaded, with `loading="interaction"`: the
     * `pointerenter`, `click` and `focus` that came before the trigger existed, the latest of
     * each, in order. Handed over once, right after the trigger starts, so a hover, a click or
     * keyboard focus that came while the icon loaded still plays it; not a pointer that has
     * left again. The page does not see them a second time.
     */
    onInteraction?(event: Event): void;
    /**
     * A playback method was called on the ready element. Return `true` (for `play`, or a
     * promise of what `play()` resolves with) to take the command over and leave the player
     * alone. Return nothing to let it through: the player runs it, and a trigger that drives
     * the player itself should step back.
     */
    onCommand?(command: Command): boolean | Promise<boolean> | void;
}

/** A playback method called on the element, as `onCommand` gets it. */
export type Command =
    | { name: 'play'; options: PlayOptions }
    | { name: 'pause' }
    | { name: 'stop' }
    | { name: 'seek'; frame: number | 'start' | 'end' };

export interface TriggerConstructor {
    new (context: TriggerContext): Trigger;
    /** The option a value without a name fills: `follow(aria-expanded)` sets `attr`. */
    readonly primary?: string;
}
