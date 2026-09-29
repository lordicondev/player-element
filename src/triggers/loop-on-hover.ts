import { BaseTrigger } from './base.ts';
import type { TriggerContext } from './types.ts';

/**
 * Loops the animation while the pointer is over the target. The round in progress finishes
 * after the pointer leaves. `loop-on-hover(500)` pauses between rounds.
 * Under reduced motion nothing plays.
 */
export class LoopOnHover extends BaseTrigger {
    static readonly primary = 'delay';

    #over = false;
    #cancelDelay: (() => void) | null = null;

    constructor(context: TriggerContext) {
        super(context);
        this.listen(this.target, 'pointerenter', () => {
            this.#over = true;
            if (!this.player.playing) this.round();
        });
        this.listen(this.target, 'pointerleave', () => {
            this.#over = false;
            this.#cancelDelay?.();
            this.#cancelDelay = null;
        });
    }

    onComplete(): void {
        if (this.#over) this.round();
    }

    private round(): void {
        if (!this.player.ready || this.reducedMotion || this.#cancelDelay) return;

        const delay = this.number('delay', 0);
        if (delay > 0) {
            this.#cancelDelay = this.timeout(() => {
                this.#cancelDelay = null;
                this.player.play({ from: 'start' });
            }, delay);
        } else {
            this.player.play({ from: 'start' });
        }
    }
}
