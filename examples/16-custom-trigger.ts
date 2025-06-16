import { Player } from "@lordicon/web";
import { defineElement, Element, Trigger } from "../src";

class Custom implements Trigger {
    player: Player;
    element: HTMLElement;
    targetElement: HTMLElement;
    direction: 1 | -1;

    constructor(player: Player, element: HTMLElement, targetElement: HTMLElement) {
        this.player = player;
        this.element = element;
        this.targetElement = targetElement;
        this.direction = this.reverse ? -1 : 1;
        this.onClick = this.onClick.bind(this);
    }

    onConnected() {
        this.targetElement.addEventListener(
            'click',
            this.onClick,
        );
    }

    onDisconnected() {
        this.targetElement.removeEventListener('click', this.onClick);

        this.player.direction = 1;
    }

    onReady() {
        this.player.direction = this.direction;

        if (this.reverse) {
            this.player.seekToEnd();
        }
    }

    onComplete() {
        this.direction = this.direction === 1 ? -1 : 1;
        this.player.direction = this.direction;
    }

    onClick() {
        if (!this.player.playing) {
            this.player.play();
        }
    }

    get reverse() {
        return this.element.hasAttribute("reverse");
    }
}

Element.defineTrigger("custom", Custom);

defineElement();
