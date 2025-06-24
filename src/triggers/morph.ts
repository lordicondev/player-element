import { Player } from '@lordicon/web';
import { Trigger } from '../interfaces';

type FrameSegment = [number, number];

/**
 * The __Morph__ trigger plays the animation forward (from the first to the last frame) when hovering over the icon,
 * and reverses it (from the last to the first frame) when the cursor leaves.
 * For some states, it plays a part of the animation on enter, and plays the remaining part when the cursor leaves.
 */
export class Morph implements Trigger {
    /**
     * Animation segments for mouse enter and leave actions.
     * segments[0] - segment for mouse enter
     * segments[1] - segment for mouse leave
     */
    protected segments?: [FrameSegment, FrameSegment];

    /**
     * Queue to manage playback requests.
     */
    protected queue: number[] = [];

    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    onConnected() {
        this.targetElement.addEventListener('mouseenter', this.onMouseEnter);
        this.targetElement.addEventListener('mouseleave', this.onMouseLeave);

        this.handleState();
    }

    onDisconnected() {
        this.targetElement.removeEventListener('mouseenter', this.onMouseEnter);
        this.targetElement.removeEventListener('mouseleave', this.onMouseLeave);

        // Restore default player state.
        this.player.direction = 1;

        // Restore original animation segment if it was set.
        if (this.segments) {
            this.player.switchSegment([
                this.segments[0][0],
                this.segments[1][1],
            ])

            this.segments = undefined;
            this.queue = [];
        }
    }

    onMouseEnter() {
        this.queue.push(0);
        this.handleQueue();
    }

    onMouseLeave() {
        this.queue.push(1);
        this.handleQueue();
    }

    onComplete() {
        this.handleQueue();
    }

    onState() {
        this.handleState();
    }

    /**
     * Processes the segment queue and plays the next segment if the player is not currently playing.
     */
    handleQueue() {
        if (this.player.playing) {
            return;
        }

        // Reduce the queue size to the last action if multiple actions are queued.
        if (this.queue.length >= 2) {
            const c = Math.floor(this.queue.length / 2) * 2;
            for (let i = 0; i < c; i++) {
                this.queue.shift();
            }
        }

        if (!this.queue.length) {
            return;
        }

        const index = this.queue.shift()!;

        if (this.segments) {
            const segment = this.segments?.[index]!;

            // Set default direction to forward.
            this.player.direction = 1;

            // Set custom animation segment.
            this.player.switchSegment(segment);
        } else {
            this.player.direction = index === 0 ? 1 : -1;
        }

        this.player.play();
    }

    /**
     * Updates the animation segments based on the current player state and parameters.
     */
    handleState() {
        // Reset segments and frames ratio.
        this.segments = undefined;

        // Get the current state.
        const state = this.player.availableStates.find(s => s.name === this.player.state);
        if (!state) {
            return;
        }

        // Get frames ratio from state parameters.
        let framesRatio = 0;
        if (state.params.length) {
            const ratio = parseFloat(state.params[0]);
            if (!isNaN(ratio) && ratio > 0 && ratio <= 1) {
                framesRatio = ratio;
            }
        }

        if (!framesRatio) {
            return;
        }

        // Calculate segments based on frames ratio.
        const segmentIn: FrameSegment = [
            state.time,
            state.time + Math.floor((state.duration + 1) * framesRatio),
        ];

        const secondaryOut: FrameSegment = [
            segmentIn[1],
            state.time + state.duration + 1,
        ];

        this.segments = [
            segmentIn,
            secondaryOut,
        ];
    }
}