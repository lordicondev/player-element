import { splitSegment, type Player, type Segment } from '@lordicon/web';

/**
 * Moves an icon between its two looks. With a morph state the first half goes to the second
 * look and the second half comes back; without one the whole animation plays forwards and
 * backwards. A change that lands mid-animation reverses it in place.
 *
 * Shared by the `morph` and `follow` triggers, which decide *when* to move.
 */
export class Morpher {
    #player: Player;
    #ratio: number | undefined;
    #segments: [Segment, Segment] | null = null;

    /** The look on screen. Null until `start()`. */
    #showing: boolean | null = null;

    /** The look the loaded segment ends on when played forwards. */
    #endsOn: boolean | null = null;

    /** True while an animation this morpher started is still playing. */
    #steering = false;

    constructor(player: Player, ratio?: number) {
        this.#player = player;
        this.#ratio = ratio;
    }

    get showing(): boolean | null {
        return this.#showing;
    }

    /** Reads the player's state and shows a look without animating. Call once the player is ready. */
    start(on: boolean): void {
        const state = this.#player.currentState;
        this.#segments = state ? splitSegment(state, this.#ratio) : null;
        this.jump(on);
    }

    /** Shows a look without animating. */
    jump(on: boolean): void {
        const player = this.#player;
        this.#steering = false;

        if (this.#segments) {
            player.segment = on ? this.#segments[0] : this.#segments[1];
            this.#endsOn = on;
            player.seek('end');
        } else {
            player.direction = 1;
            player.seek(on ? 'end' : 'start');
        }

        this.#showing = on;
    }

    /** Animates to a look. */
    animate(on: boolean): void {
        const player = this.#player;

        if (!this.#segments) {
            // The whole animation is the transition: forwards to get there, backwards to undo.
            player.direction = on ? 1 : -1;
            player.play();
        } else if (player.playing && this.#steering) {
            // Interrupted mid-morph. Loading the other half would jump to its first frame, so
            // turn the loaded half around instead; both halves meet at the boundary, so
            // either one reaches either look.
            player.direction = this.#endsOn === on ? 1 : -1;
            player.play();
        } else {
            player.play({ segment: on ? this.#segments[0] : this.#segments[1] });
            this.#endsOn = on;
        }

        this.#steering = true;
        this.#showing = on;
    }

    /** Call from the trigger's `onComplete`. */
    complete(): void {
        this.#steering = false;
    }

    /** Puts the player back on its whole state, forwards. Call at teardown. */
    restore(): void {
        this.#player.segment = null;
    }
}
