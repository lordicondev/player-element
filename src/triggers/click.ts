import { Trigger } from '../interfaces';
import { Player } from '@lordicon/web';

const CLICK_EVENTS = [
    { name: 'mousedown' },
    { name: 'touchstart', options: { passive: true } },
];

/**
 * The __Click__ trigger plays the animation when the icon (its target) is clicked or tapped.
 */
export class Click implements Trigger {
    constructor(
        protected player: Player,
        protected element: HTMLElement,
        protected targetElement: HTMLElement,
    ) {
        this.onClick = this.onClick.bind(this);
    }

    onConnected() {
        for (const event of CLICK_EVENTS) {
            this.targetElement.addEventListener(event.name, this.onClick, event.options)
        }
    }

    onDisconnected() {
        for (const event of CLICK_EVENTS) {
            this.targetElement.removeEventListener(event.name, this.onClick)
        }
    }

    onClick() {
        if (this.player.playing) {
            return;
        }

        this.player.playFromStart();
    }
}
