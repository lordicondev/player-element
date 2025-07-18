import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

/**
 * The __Click__ trigger plays the animation when the icon (its target) is clicked or tapped.
 */
export class Click implements Trigger {
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

        this.replay();
    }

    onConnected() {
        this.connected = true;
        this.targetElement.addEventListener('click', this.onClick);

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

        this.cleanup();
    }

    onComplete() {
        this.resetState();
    }

    onClick() {
        if (this.player.playing) {
            return;
        }

        this.player.playFromStart();
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
}
