import { BaseTrigger } from './base.ts';
import type { TriggerContext } from './types.ts';

/**
 * Plays the animation once when the pointer enters the target, or when keyboard focus
 * lands on it (`:focus-visible`, so a click does not play it twice). A second arrival
 * during the animation is ignored. Under reduced motion nothing plays.
 */
export class Hover extends BaseTrigger {
    constructor(context: TriggerContext) {
        super(context);
        this.listen(this.target, 'pointerenter', () => this.play());
        this.listen(this.target, 'focus', () => {
            if (this.target.matches(':focus-visible')) this.play();
        });
    }

    private play(): void {
        if (!this.player.ready || this.player.playing || this.reducedMotion) return;
        this.player.play({ from: 'start' });
    }
}
