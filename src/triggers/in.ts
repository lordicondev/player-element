import { Player } from '@lordicon/web';
import { Trigger } from '../interfaces';

/**
 * The __In__ trigger plays the animation when the icon (target) enters the user's viewport.
 */
export class In implements Trigger {
    protected connected: boolean = false;
    protected delayTimer: any = null;
    protected intersectionObserver: IntersectionObserver | undefined;

    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onClick = this.onClick.bind(this);
    }

    onConnected() {
        this.connected = true;
        this.targetElement.addEventListener('click', this.onClick);

        if (this.loading) {
            this.play(true);
        } else {
            this.initIntersectionObserver();
        }
    }

    onDisconnected() {
        this.connected = false;
        this.targetElement.removeEventListener('click', this.onClick);

        this.cleanup();
    }

    onClick() {
        if (this.clickToReplay) {
            this.play();
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

    protected scheduleDelayedPlay(): void {
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

    protected cleanup(): void {
        this.resetIntersectionObserver();
        this.resetDelayTimer();
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