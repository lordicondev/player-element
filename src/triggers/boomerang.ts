import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

/**
 * The __Boomerang__ trigger plays the animation forward when you hover over the element,
 * and after reaching the end, it automatically plays in reverse.
 */
export class Boomerang implements Trigger {
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

        this.player.direction = 1;
    }

    onComplete() {
        this.player.direction = -1;
        this.player.play();
    }

    onHover() {
        this.player.direction = 1;
        this.player.play();
    }
}