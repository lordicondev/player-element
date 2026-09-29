import { BaseTrigger } from './base.ts';
import { Morpher } from './morpher.ts';
import type { TriggerContext } from './types.ts';

/**
 * Morphs to the second look while the pointer is over the target, and back when it leaves.
 * The split point comes from the morph marker (`morph-close:0.5`) or `morph(0.6)`.
 * Under reduced motion the icon jumps between the two looks.
 */
export class Morph extends BaseTrigger {
    static readonly primary = 'ratio';

    #morpher: Morpher;
    #over = false;

    constructor(context: TriggerContext) {
        super(context);
        const ratio = this.ratio();
        this.#morpher = new Morpher(this.player, ratio);

        this.listen(this.target, 'pointerenter', () => this.set(true));
        this.listen(this.target, 'pointerleave', () => this.set(false));
        this.signal.addEventListener('abort', () => this.#morpher.restore(), { once: true });
    }

    onReady(): void {
        this.#morpher.start(this.#over);
    }

    onComplete(): void {
        this.#morpher.complete();
    }

    private set(over: boolean): void {
        this.#over = over;
        if (!this.player.ready || this.#morpher.showing === over) return;

        if (this.reducedMotion) this.#morpher.jump(over);
        else this.#morpher.animate(over);
    }
}
