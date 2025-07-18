import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

type FrameSegment = [number, number];

/**
 * The __Boomerang__ trigger plays the animation forward when you hover over the element,
 * and after reaching the end, it automatically plays in reverse.
 */
export class Boomerang implements Trigger {
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

    protected connected: boolean = false;
    protected targetState?: string;
    protected delayTimer: any = null;
    protected intersectionObserver: IntersectionObserver | undefined;

    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onClick = this.onClick.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);

        this.handleState();
        this.replay();
    }

    onConnected() {
        this.connected = true;
        this.targetElement.addEventListener('click', this.onClick);
        this.targetElement.addEventListener('mouseenter', this.onMouseEnter);

        if (this.targetState) {
            if (this.loading) {
                this.play(true);
            } else {
                this.initIntersectionObserver();
            }
        }
    }

    onDisconnected() {
        this.connected = false;
        this.targetElement.removeEventListener('click', this.onClick);
        this.targetElement.removeEventListener('mouseenter', this.onMouseEnter);

        this.cleanup();
    }

    onMouseEnter() {
        this.queue.push(0);
        this.queue.push(1);
        this.handleQueue();
    }

    onComplete() {
        if (this.targetState) {
            this.resetState();
        } else {
            this.handleQueue();
        }
    }

    onState() {
        this.handleState();
    }

    onClick() {
        if (this.clickToReplay) {
            this.replay();
        }
    }

    play(handleDelay?: boolean) {
        if (this.player.playing || this.delayTimer) {
            return;
        }

        if (handleDelay && this.delay > 0) {
            this.scheduleDelayedPlay();
        } else {
            this.player.playFromStart();
        }
    }

    replay() {
        if (this.player.playing || !this.player.state || !this.intro) {
            return;
        }

        this.targetState = this.player.state;
        this.player.state = this.intro;

        if (this.connected) {
            this.play();
        }
    }

    protected scheduleDelayedPlay(): void {
        this.resetDelayTimer();
        this.delayTimer = setTimeout(() => {
            this.player.playFromStart();
            this.delayTimer = null;
        }, this.delay);
    }

    /**
     * Processes the segment queue and plays the next segment if the player is not currently playing.
     */
    protected handleQueue() {
        if (this.player.playing) {
            return;
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
    protected handleState() {
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

        const segmentOut: FrameSegment = [
            segmentIn[1],
            state.time + state.duration + 1,
        ];

        this.segments = [
            segmentIn,
            segmentOut,
        ];
    }

    protected initIntersectionObserver() {
        if (this.intersectionObserver) {
            return;
        }

        const callback: IntersectionObserverCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.play(true);

                    this.resetIntersectionObserver();
                }
            });
        };

        this.intersectionObserver = new IntersectionObserver(callback, { threshold: 0.5 });
        this.intersectionObserver.observe(this.element);
    }

    protected resetIntersectionObserver() {
        if (!this.intersectionObserver) {
            return;
        }

        this.intersectionObserver.unobserve(this.element);
        this.intersectionObserver = undefined;
    }

    protected resetDelayTimer() {
        if (!this.delayTimer) {
            return;
        }

        clearTimeout(this.delayTimer);
        this.delayTimer = null;
    }

    protected resetState() {
        if (this.targetState) {
            this.player.state = this.targetState;
            this.targetState = undefined;
            return true;
        } else {
            return false;
        }
    }

    protected resetPlayer() {
        // Restore default player state.
        this.player.direction = 1;

        // Restore original animation segment if it was set.
        if (this.segments) {
            this.player.switchSegment([
                this.segments[0][0],
                this.segments[1][1],
            ]);

            this.segments = undefined;
            this.queue = [];
        }
    }

    protected cleanup() {
        this.resetPlayer();
        this.resetIntersectionObserver();
        this.resetDelayTimer();
        this.resetState();
    }

    get intro(): string | null {
        const introEnabled = this.element.hasAttribute('intro');
        if (!introEnabled) {
            return null;
        }

        const introState = this.element.getAttribute('intro');

        let state = this.player.availableStates.find(s => s.name === introState);
        if (!state) {
            state = this.player.availableStates.find(s => s.name.startsWith('in-'));
        }

        return state?.name || null;
    }

    get delay() {
        const value = this.element.hasAttribute('delay') ? +(this.element.getAttribute('delay') || 0) : 0;
        return Math.max(value, 0);
    }

    get loading() {
        return this.element.hasAttribute('loading');
    }

    get clickToReplay() {
        return this.element.hasAttribute('click-to-replay');
    }
}