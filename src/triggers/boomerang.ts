import { splitSegment, type Segment } from '@lordicon/web';
import { BaseTrigger } from './base.ts';
import type { TriggerContext } from './types.ts';

/**
 * On pointer enter, plays the animation there and straight back. With a morph state the two
 * halves play one after the other; without one the animation plays forwards, then in reverse.
 * `boomerang(0.6)` overrides the marker's split. A pointer arriving mid-flight is
 * ignored. Under reduced motion nothing plays.
 */
export class Boomerang extends BaseTrigger {
    static readonly primary = 'ratio';

    #segments: [Segment, Segment] | null = null;
    #phase: 'idle' | 'out' | 'back' = 'idle';

    constructor(context: TriggerContext) {
        super(context);
        this.listen(this.target, 'pointerenter', () => this.go());
        this.signal.addEventListener('abort', () => (this.player.segment = null), { once: true });
    }

    onReady(): void {
        const state = this.player.currentState;
        this.#segments = state ? splitSegment(state, this.ratio()) : null;
    }

    onComplete(): void {
        if (this.#phase === 'out') {
            this.#phase = 'back';
            if (this.#segments) this.player.play({ segment: this.#segments[1] });
            else this.player.play({ reverse: true });
        } else if (this.#phase === 'back') {
            this.#phase = 'idle';
            this.player.direction = 1;
        }
    }

    private go(): void {
        if (!this.player.ready || this.player.playing || this.reducedMotion) return;

        this.#phase = 'out';
        if (this.#segments) this.player.play({ segment: this.#segments[0] });
        else this.player.play({ from: 'start' });
    }
}
