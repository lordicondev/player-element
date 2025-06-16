import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

/**
 * The __Loop__ trigger plays the animation from the first to the last frame infinitely, with no interaction necessary.
 */
export class Loop implements Trigger {
    protected playTimeout: any = null;

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
        this.resetPlayDelayTimer();
    }

    play() {
        this.resetPlayDelayTimer();

        if (this.delay > 0) {
            this.playTimeout = setTimeout(() => {
                this.player.playFromStart();
            }, this.delay)
        } else {
            this.player.playFromStart();
        }
    }

    resetPlayDelayTimer() {
        if (!this.playTimeout) {
            return;
        }

        clearTimeout(this.playTimeout);
        this.playTimeout = null;
    }

    get delay() {
        const value = this.element.hasAttribute('delay') ? +(this.element.getAttribute('delay') || 0) : 0;
        return Math.max(value, 0);
    }
}