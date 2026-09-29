import { BaseTrigger } from '../base.ts';
import type { TriggerContext } from '../types.ts';
import { BooleanFollow } from './boolean.ts';
import { CountFollow } from './count.ts';
import { MapFollow } from './map.ts';
import type { FollowContext, FollowStrategy } from './strategy.ts';

/**
 * Follows an attribute on the target. Which attribute is the first value (default
 * `aria-pressed`); how the icon reacts depends on the value:
 *
 * - `"true"` / `"false"`: morph there and back with a `morph-*` state, or play once on true
 *   (`follow(aria-pressed)`, `follow(aria-expanded, ratio=0.6)`)
 * - a number: an entrance when it leaves zero, a nudge when it goes up again
 *   (`follow(data-count)`)
 * - a value map: a state per value, loops and morphs handled
 *   (`follow(data-stage, busy=loop-cycle, done=morph-check)`)
 *
 * Any option besides `attr` and `ratio` makes a map. Otherwise the value picks the mode: a
 * number counts, anything else is a boolean. With no value yet, the first one decides.
 */
export class Follow extends BaseTrigger {
    static readonly primary = 'attr';

    #attribute: string;
    #strategy: FollowStrategy | null = null;
    /** No value at ready: boolean for now, until the first value says otherwise. */
    #undecided = false;

    constructor(context: TriggerContext) {
        super(context);
        this.#attribute = this.option('attr', 'aria-pressed');
        this.watch(this.target, this.#attribute, () => this.change());
        this.signal.addEventListener('abort', () => this.#strategy?.restore(), { once: true });
    }

    private get value(): string | null {
        return this.target.getAttribute(this.#attribute);
    }

    private get context(): FollowContext {
        return { player: this.player, element: this.element, reducedMotion: this.reducedMotion };
    }

    onReady(): void {
        const { attr: _attr, ratio: _ratio, ...map } = this.options;
        // From before the interaction that loaded the icon, if one did: a change made while it
        // loaded then plays as any other.
        const value = this.startingAttribute(this.#attribute);

        if (Object.keys(map).length) {
            this.#strategy = new MapFollow(this.context, map, this.ratio());
        } else if (isNumber(value)) {
            this.#strategy = new CountFollow(this.context);
        } else {
            this.#strategy = new BooleanFollow(this.context, this.ratio());
            this.#undecided = !value?.trim();
        }

        this.#strategy.ready(value);
        if (value !== this.value) this.change();
    }

    onComplete(): void {
        this.#strategy?.complete();
    }

    private change(): void {
        const value = this.value;

        if (this.#undecided && this.player.ready && value?.trim()) {
            this.#undecided = false;
            if (isNumber(value)) {
                this.#strategy?.restore();
                this.#strategy = new CountFollow(this.context);
                this.#strategy.ready('0');
            }
        }

        this.#strategy?.change(value);
    }
}

function isNumber(value: string | null): boolean {
    return value !== null && value.trim() !== '' && !Number.isNaN(Number(value));
}
