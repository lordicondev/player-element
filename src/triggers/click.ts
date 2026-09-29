import { BaseTrigger } from './base.ts';
import type { TriggerContext } from './types.ts';

/**
 * Plays the animation from the start on every click of the target. A click during the
 * animation starts it again. Under reduced motion nothing plays.
 */
export class Click extends BaseTrigger {
    constructor(context: TriggerContext) {
        super(context);
        this.listen(this.target, 'click', () => this.play());
    }

    private play(): void {
        if (!this.player.ready || this.reducedMotion) return;
        this.player.play({ from: 'start' });
    }
}
