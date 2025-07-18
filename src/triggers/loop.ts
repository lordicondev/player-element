import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

/**
 * The __Loop__ trigger plays the animation from the first to the last frame infinitely, with no interaction necessary.
 */
export class Loop implements Trigger {
    protected delayTimer: any = null;

    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
    }

    onReady() {
        this.play();
    }

    onComplete() {
        this.play();
    }

    onDisconnected() {
        this.resetDelayTimer();
    }

    play() {
        if (this.player.playing || this.delayTimer) {
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