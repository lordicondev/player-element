import { BaseTrigger } from './base.ts';

/**
 * Plays the animation over and over. `loop(1000)` pauses between rounds.
 * Under reduced motion the icon stays on its first frame.
 */
export class Loop extends BaseTrigger {
    static readonly primary = 'delay';

    onReady(): void {
        this.round();
    }

    onComplete(): void {
        this.round();
    }

    private round(): void {
        if (this.reducedMotion) return;

        const delay = this.number('delay', 0);
        if (delay > 0) this.timeout(() => this.player.play({ from: 'start' }), delay);
        else this.player.play({ from: 'start' });
    }
}
