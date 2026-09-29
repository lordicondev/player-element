import type { FollowContext, FollowStrategy } from './strategy.ts';

/**
 * A number: a message shown again, a count going up. Up from zero plays the element's
 * `state` (an entrance, usually); up again plays the icon's default state as a nudge; down
 * plays nothing. A nudge that lands while the icon is still playing is dropped.
 */
export class CountFollow implements FollowStrategy {
    #context: FollowContext;
    #count = 0;
    #entrance: string | null = null;

    constructor(context: FollowContext) {
        this.#context = context;
    }

    ready(value: string | null): void {
        this.#entrance = this.#context.element.state;
        this.#count = toCount(value);
    }

    change(value: string | null): void {
        const { player, reducedMotion } = this.#context;
        if (!player.ready) return;

        const was = this.#count;
        this.#count = toCount(value);
        if (this.#count <= was) return;

        if (was === 0) {
            if (reducedMotion) {
                player.state = this.#entrance;
                player.seek('end');
            } else {
                player.play({ state: this.#entrance });
            }
            return;
        }

        if (player.playing || reducedMotion) return;

        player.play({ state: null }); // the icon's default state
    }

    complete(): void {}

    restore(): void {}
}

function toCount(value: string | null): number {
    return Math.max(0, Number(value) || 0);
}
