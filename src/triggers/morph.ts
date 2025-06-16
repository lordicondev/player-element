import { Player } from '@lordicon/web';
import { Trigger } from '../interfaces';

/**
 * The __Morph__ trigger plays the animation forward (from the first to the last frame) when hovering over the icon, and reverses it (from the last to the first frame) when the cursor leaves.
 */
export class Morph implements Trigger {
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

        this.player.direction = 1;
    }

    onMouseEnter() {
        this.player.direction = 1;
        this.player.play();
    }

    onMouseLeave() {
        this.player.direction = -1;
        this.player.play();
    }
}