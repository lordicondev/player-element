import { whenVisible } from '../element/loading/lazy.ts';
import { BaseTrigger } from './base.ts';

/**
 * Plays the animation once, when at least half of the icon has entered the viewport.
 * `in(300)` waits before playing. Under reduced motion the icon jumps to its last frame.
 */
export class In extends BaseTrigger {
    static readonly primary = 'delay';

    onReady(): void {
        whenVisible(this.element, this.signal, 0.5).then(
            () => this.arrive(),
            () => {}, // torn down before it was seen
        );
    }

    private arrive(): void {
        if (this.reducedMotion) {
            this.player.seek('end');
            return;
        }

        const delay = this.number('delay', 0);
        if (delay > 0) this.timeout(() => void this.player.play({ from: 'start' }), delay);
        else this.player.play({ from: 'start' });
    }
}
