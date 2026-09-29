import { stateType, type Player } from '@lordicon/web';
import { abortable } from './abortable.ts';
import { parseParams } from '../triggers/params.ts';
import { wait } from './loading/delay.ts';
import { whenVisible } from './loading/lazy.ts';
import { settled } from './settled.ts';
import { findTarget } from './target.ts';

/** What the `intro` attribute asks for: `intro="hover-pinch, after=.card, delay=300"`. */
export type Intro = {
    /** The state to play. */
    state: string;
    /** A selector for the ancestor whose animations have to finish first. */
    after: string | null;
    /** How long to wait before playing, in ms. */
    delay: number;
};

const OPTIONS = ['after', 'delay'];

/**
 * Reads the `intro` attribute. The first value names the state; without it, the first
 * `in-*` state is used. Null when there is no intro or no such state (with a warning).
 */
export function parseIntro(value: string | null, states: string[]): Intro | null {
    if (value === null) return null;

    const source = `intro="${value}"`;
    const { primary, options } = parseParams(value, source);

    for (const key of Object.keys(options)) {
        if (!OPTIONS.includes(key)) console.warn(`lord-icon: unknown option "${key}" in ${source}`);
    }

    const state = primary ?? states.find((name) => stateType(name) === 'in');
    if (!state) return null;

    if (!states.includes(state)) {
        console.warn(`lord-icon: intro state "${state}" not found`);
        return null;
    }

    const delay = Number(options.delay);
    return {
        state,
        after: options.after || null,
        delay: Number.isFinite(delay) && delay > 0 ? delay : 0,
    };
}

/**
 * Plays the intro once the icon is visible (and, with `after`, once the ancestor has
 * stopped animating), then puts the player back on the element's own state. Rejects
 * when the signal aborts.
 */
export async function playIntro(
    element: HTMLElement & { state: string | null },
    player: Player,
    intro: Intro,
    signal: AbortSignal,
): Promise<void> {
    await whenVisible(element, signal);

    if (intro.after) {
        const ancestor = findTarget(element, intro.after);
        if (ancestor) await settled(ancestor, signal);
        else
            console.warn(`lord-icon: intro waits after "${intro.after}", which is not an ancestor`);
    }

    if (intro.delay) await wait(intro.delay, signal);

    await abortable(player.play({ state: intro.state }), signal);

    // The attribute may have changed while the intro played; that value wins.
    player.state = element.state;
}
