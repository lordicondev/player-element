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
     * Queue to manage segment playback requests.
     */
    protected segmentQueue: number[] = [];

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
    }

    onMouseEnter() {
        if (this.segments) {
            this.segmentQueue.push(0);
            this.handleQueue();
        } else {
            this.player.direction = 1;
            this.player.play();
        }
    }

    onMouseLeave() {
        if (this.segments) {
            this.segmentQueue.push(1);
            this.handleQueue();
        } else {
            this.player.direction = -1;
            this.player.play();
        }
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
        if (this.segmentQueue.length >= 2) {
            const c = Math.floor(this.segmentQueue.length / 2) * 2;
            for (let i = 0; i < c; i++) {
                this.segmentQueue.shift();
            }
        }

        if (!this.segmentQueue.length) {
            return;
        }

        const index = this.segmentQueue.shift()!;
        const segment = this.segments?.[index]!;

        // Set default direction to forward.
        this.player.direction = 1;

        // Set custom animation segment.
        this.player.lottieInstance!.setSegment(
            segment[0],
            segment[1],
        );

        this.player.seekToStart();
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