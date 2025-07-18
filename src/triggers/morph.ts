import { Player } from '@lordicon/web';
import { Trigger } from '../interfaces';

type FrameSegment = [number, number];

type TRIGGER_MODE = 'hover' | 'class' | 'manual';

const MUTATION_OBSERVER_CONFIG = { attributes: true, childList: false, subtree: false, attributeOldValue: true };

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

    protected mouseIn: boolean = false;
    protected connected: boolean = false;
    protected targetState?: string;
    protected delayTimer: any = null;
    protected mutationTimer: any = null;
    protected intersectionObserver: IntersectionObserver | undefined;
    protected observer: MutationObserver | undefined;

    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onClick = this.onClick.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);

        this.handleState();
        this.replay();
    }

    onConnected() {
        this.connected = true;
        this.targetElement.addEventListener('click', this.onClick);
        this.targetElement.addEventListener('mouseenter', this.onMouseEnter);
        this.targetElement.addEventListener('mouseleave', this.onMouseLeave);

        if (this.mode[0] === 'class') {
            this.initMutationObserver();
        }

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
        this.targetElement.removeEventListener('mouseleave', this.onMouseLeave);

        this.cleanup();
    }

    onMouseEnter() {
        if (this.mode[0] !== 'hover') {
            return;
        }

        this.mouseIn = true;
        this.triggerEnter();
    }

    onMouseLeave() {
        if (this.mode[0] !== 'hover') {
            return;
        }

        this.mouseIn = false;
        this.triggerLeave();
    }

    onComplete() {
        if (this.targetState) {
            this.resetState();

            if (this.mouseIn) {
                this.queue.push(0);
                this.handleQueue();
            }
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

    triggerEnter() {
        this.queue.push(0);
        this.handleQueue();
    }

    triggerLeave() {
        this.queue.push(1);
        this.handleQueue();
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

        const mode = this.mode;
        if (mode[0] === 'class') {
            const isActive = this.targetElement.classList.contains(mode[1]!);
            if (isActive) {
                this.player.switchSegment(segmentIn);
                this.player.frame = segmentIn[0];
            }
        }
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

    protected initMutationObserver() {
        if (!this.observer) {
            this.observer = new MutationObserver((mutationList) => {
                const mode = this.mode;
                if (mode[0] !== 'class') {
                    return;
                }

                const className = mode[1] || '';

                for (const mutation of mutationList) {
                    if (mutation.type === 'attributes' && ['class'].includes(mutation.attributeName!)) {
                        const oldValue = (mutation.oldValue || '').split(' ').includes(className);
                        const newValue = (this.targetElement.getAttribute('class') || '').split(' ').includes(className);

                        if (oldValue !== newValue) {
                            clearTimeout(this.mutationTimer);
                            this.mutationTimer = setTimeout(() => {
                                if (newValue) {
                                    this.triggerEnter();
                                } else {
                                    this.triggerLeave();
                                }
                            }, 10);
                        }
                    }
                }
            });
        }

        this.observer.observe(this.targetElement, MUTATION_OBSERVER_CONFIG);
    }

    protected resetMutationObserver() {
        clearTimeout(this.mutationTimer);
        this.mutationTimer = null;

        if (this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }
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
        this.resetMutationObserver();
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

    get mode(): [TRIGGER_MODE, string?] {
        if (this.element.hasAttribute('mode')) {
            const mode = this.element.getAttribute('mode');
            const parts = mode?.split(':') || [];
            if (parts.length > 0 && ['hover', 'class', 'manual'].includes(parts[0])) {
                if (parts[0] === 'class') {
                    return [parts[0] as TRIGGER_MODE, parts[1] || 'active'];
                }
                return [parts[0] as TRIGGER_MODE];
            }
        }

        return ['hover'];
    }
}