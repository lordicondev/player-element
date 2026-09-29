import { stateType } from '@lordicon/web';
import type { TriggerContext } from '../types.ts';

/** How `follow` reacts to the attribute, chosen once the player is ready. */
export interface FollowStrategy {
    /** The player is ready; show the starting value without animating. */
    ready(value: string | null): void;
    /** The attribute changed. */
    change(value: string | null): void;
    /** The player finished a segment. */
    complete(): void;
    /** The trigger is torn down. */
    restore(): void;
}

/** What every strategy needs from the trigger. */
export type FollowContext = Pick<TriggerContext, 'player' | 'element' | 'reducedMotion'>;

/** The morph and loop states are recognised by their names. */
export const isMorph = (state: string | null | undefined): boolean =>
    !!state && stateType(state) === 'morph';
export const isLoop = (state: string | null | undefined): boolean =>
    !!state && stateType(state) === 'loop';
