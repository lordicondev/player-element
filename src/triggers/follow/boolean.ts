import { Morpher } from '../morpher.ts';
import { isMorph, type FollowContext, type FollowStrategy } from './strategy.ts';

/**
 * A boolean attribute, `"true"` or anything else. With a `morph-*` state the icon morphs
 * to its second look and back; with any other state it plays once when the value turns true.
 */
export class BooleanFollow implements FollowStrategy {
    #context: FollowContext;
    #morpher: Morpher | null;
    #on = false;

    constructor(context: FollowContext, ratio?: number) {
        this.#context = context;
        this.#morpher = isMorph(context.player.state) ? new Morpher(context.player, ratio) : null;
    }

    ready(value: string | null): void {
        this.#on = value === 'true';
        this.#morpher?.start(this.#on);
    }

    change(value: string | null): void {
        const { player, reducedMotion } = this.#context;
        const on = value === 'true';
        if (!player.ready) return;

        if (this.#morpher) {
            if (this.#morpher.showing === on) return;
            if (reducedMotion) this.#morpher.jump(on);
            else this.#morpher.animate(on);
            return;
        }

        if (on === this.#on) return;
        this.#on = on;
        if (!on || player.playing) return;

        if (reducedMotion) player.seek('end');
        else player.play({ from: 'start' });
    }

    complete(): void {
        this.#morpher?.complete();
    }

    restore(): void {
        this.#morpher?.restore();
    }
}
