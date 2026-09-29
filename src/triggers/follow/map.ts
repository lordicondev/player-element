import { findState, splitSegment, stateSegment, type Segment } from '@lordicon/web';
import { isLoop, isMorph, type FollowContext, type FollowStrategy } from './strategy.ts';

/**
 * A value mapped to states: `follow(attr=data-stage, busy=loop-cycle, done=morph-check)`.
 *
 * - a `loop-*` state loops while the value holds, and finishes its round before moving on
 * - a `morph-*` state goes to its second look, and back when the value goes to one with no
 *   state: with a ratio in its marker as two halves, without one forwards and then backwards
 * - any other state plays once
 * - a value with no state (unmapped, or mapped to nothing) is the resting look
 */
export class MapFollow implements FollowStrategy {
    #context: FollowContext;
    #map: Record<string, string>;
    #ratio: number | undefined;

    /** The value the target has, and the one the icon has got round to showing. */
    #wanted: string | null = null;
    #showing: string | null = null;

    constructor(context: FollowContext, map: Record<string, string>, ratio?: number) {
        this.#context = context;
        this.#map = map;
        this.#ratio = ratio;
    }

    ready(value: string | null): void {
        this.#wanted = value;
        this.settle(true);
    }

    change(value: string | null): void {
        const { player } = this.#context;
        this.#wanted = value;
        if (!player.ready) return;

        // Mid-loop: let the round finish; complete() picks the new value up.
        if (isLoop(this.stateFor(this.#showing)) && player.playing) return;

        this.settle(false);
    }

    complete(): void {
        if (!isLoop(this.stateFor(this.#showing))) return;

        if (this.#wanted === this.#showing) this.play(this.segmentOf(this.stateFor(this.#showing)));
        else this.settle(false);
    }

    restore(): void {
        this.#context.player.segment = null;
    }

    private stateFor(value: string | null): string | null {
        return (value !== null && this.#map[value]) || null;
    }

    private segmentOf(state: string | null): Segment | null {
        const found = state ? findState(this.#context.player.states, state) : null;
        return found ? stateSegment(found) : null;
    }

    private halves(state: string | null): [Segment, Segment] | null {
        const found = state ? findState(this.#context.player.states, state) : null;
        return found ? splitSegment(found, this.#ratio) : null;
    }

    /** Takes the icon to the wanted value from wherever it is. */
    private settle(jump: boolean): void {
        const { reducedMotion } = this.#context;
        const from = this.stateFor(this.#showing);
        const state = this.stateFor(this.#wanted);
        this.#showing = this.#wanted;

        if (isLoop(state)) {
            if (jump || reducedMotion) this.rest();
            else this.play(this.segmentOf(state));
        } else if (isMorph(state)) {
            const halves = this.halves(state);
            if (jump || reducedMotion) this.jump(halves?.[0] ?? this.segmentOf(state));
            else this.play(halves?.[0] ?? this.segmentOf(state));
        } else if (state) {
            if (jump || reducedMotion) this.jump(this.segmentOf(state));
            else this.play(this.segmentOf(state));
        } else if (isMorph(from) && !jump && !reducedMotion) {
            // Back from a confirmed look: the second half of the morph we came in on, or,
            // without a ratio, the whole morph backwards.
            const halves = this.halves(from);
            if (halves) this.play(halves[1]);
            else this.play(this.segmentOf(from), true);
        } else {
            this.rest();
        }
    }

    /** The resting look: the first frame of the element's own state. */
    private rest(): void {
        const { player, element } = this.#context;
        player.state = element.state;
        player.segment = null;
    }

    /** Plays a segment from its start, or the loaded one when there is none. */
    private play(segment: Segment | null, reverse = false): void {
        const { player } = this.#context;
        if (segment) player.play({ segment, reverse });
        else player.play({ from: 'start', reverse });
    }

    private jump(segment: Segment | null): void {
        const { player } = this.#context;
        if (segment) player.segment = segment;
        else player.direction = 1;
        player.seek('end');
    }
}
