import { Player } from '@lordicon/web';
import { Trigger } from '../interfaces';

/**
 * The __Hover__ trigger plays the animation from the first to the last frame when the cursor hovers over the icon (target).
 */
export class Hover implements Trigger {
    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onHover = this.onHover.bind(this);
    }

    onConnected() {
        this.targetElement.addEventListener('mouseenter', this.onHover);
    }

    onDisconnected() {
        this.targetElement.removeEventListener('mouseenter', this.onHover);
    }

    onHover() {
        if (this.player.playing) {
            return;
        }

        this.player.playFromStart();
    }
}