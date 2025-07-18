import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

/**
 * The __LoopOnHover__ trigger plays the animation from the first to the last frame in an infinite loop while the cursor hovers over the icon (target).
 */
export class LoopOnHover implements Trigger {
    protected delayTimer: any = null;
    protected mouseIn: boolean = false;

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
    }

    onDisconnected() {
        this.targetElement.removeEventListener('mouseenter', this.onMouseEnter);
        this.targetElement.removeEventListener('mouseleave', this.onMouseLeave);

        this.resetDelayTimer();
    }

    onMouseEnter() {
        this.mouseIn = true;

        this.play();
    }

    onMouseLeave() {
        this.mouseIn = false;

        this.resetDelayTimer();
    }

    onComplete() {
        this.play();
    }

    play() {
        if (this.player.playing || this.delayTimer) {
            return;
        }

        if (!this.mouseIn) {
            return;
        }

        if (this.delay > 0) {
            this.scheduleDelayedPlay();
        } else {
            this.player.playFromStart();
        }
    }

    protected scheduleDelayedPlay() {
        this.resetDelayTimer();
        this.delayTimer = setTimeout(() => {
            this.player.playFromStart();
            this.delayTimer = null;
        }, this.delay);
    }

    protected resetDelayTimer() {
        if (!this.delayTimer) {
            return;
        }

        clearTimeout(this.delayTimer);
        this.delayTimer = null;
    }

    get delay() {
        const value = this.element.hasAttribute('delay') ? +(this.element.getAttribute('delay') || 0) : 0;
        return Math.max(value, 0);
    }
}