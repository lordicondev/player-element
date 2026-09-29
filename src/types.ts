import type { Trigger } from './triggers/types.ts';
import type { CompleteDetail, IconData, IconProperties, Player } from '@lordicon/web';

export type {
    ColorMap,
    CompleteDetail,
    IconData,
    IconProperties,
    IconState,
    PlaybackDirection,
    Player,
    PlayOptions,
    Segment,
    Stroke,
} from '@lordicon/web';

/** How the element decides when to load the icon. See the `loading` attribute. */
export type LoadingStrategy =
    { kind: 'eager' } | { kind: 'lazy' } | { kind: 'interaction' } | { kind: 'delay'; ms: number };

/** `auto` respects `prefers-reduced-motion`; `always` animates regardless. */
export type MotionMode = 'auto' | 'always';

/** Creates the player for an icon. Replaced in tests with a stub. */
export type PlayerFactory = (
    container: HTMLElement,
    data: IconData,
    properties: IconProperties,
) => Player;

/** Events the element dispatches, on top of the usual HTMLElement ones. */
export interface LordIconEventMap extends Omit<HTMLElementEventMap, 'error'> {
    ready: CustomEvent<void>;
    error: CustomEvent<Error>;
    complete: CustomEvent<CompleteDetail>;
    state: CustomEvent<string | null>;
    /** The trigger started, was replaced, or went with the icon: the new `currentTrigger`, or null. */
    trigger: CustomEvent<Trigger | null>;
}
