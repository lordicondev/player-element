import { Player } from "@lordicon/web";
import { Element, Trigger, defineElement } from "../src";

class Scroll implements Trigger {
    player: Player;
    element: HTMLElement;
    targetElement: HTMLElement;

    constructor(player: Player, element: HTMLElement, targetElement: HTMLElement) {
        this.player = player;
        this.element = element;
        this.targetElement = targetElement;

        this.scroll = this.scroll.bind(this);
    }

    onReady() {
        document.addEventListener("scroll", this.scroll);

        this.scroll();
    }

    onDisconnected() {
        document.removeEventListener("scroll", this.scroll);
    }

    scroll() {
        const wy = window.scrollY;
        const p = (wy / window.innerHeight) % 1;

        this.player.frame = this.player.frameCount * p;
    }
}

Element.defineTrigger("scroll", Scroll);

defineElement();
