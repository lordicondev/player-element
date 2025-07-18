import { Player } from '@lordicon/web';
import { Trigger } from '../interfaces';

/**
 * The __Hover__ trigger plays the animation from the first to the last frame when the cursor hovers over the icon (target).
 */
export class Hover implements Trigger {
    protected connected: boolean = false;
    protected targetState?: string;
    protected delayTimer: any = null;
    protected intersectionObserver: IntersectionObserver | undefined;

    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onHover = this.onHover.bind(this);
        this.onClick = this.onClick.bind(this);

        this.replay();
    }

    onConnected() {
        this.connected = true;
        this.targetElement.addEventListener('click', this.onClick);
        this.targetElement.addEventListener('mouseenter', this.onHover);

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
        this.targetElement.removeEventListener('mouseenter', this.onHover);

        this.cleanup();
    }

    onComplete() {
        this.resetState();
    }

    onHover() {
        if (this.targetState) {
            return;
        }

        this.play();
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

    protected scheduleDelayedPlay() {
        this.resetDelayTimer();
        this.delayTimer = setTimeout(() => {
            this.player.playFromStart();
            this.delayTimer = null;
        }, this.delay);
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
        }
    }

    protected cleanup(): void {
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