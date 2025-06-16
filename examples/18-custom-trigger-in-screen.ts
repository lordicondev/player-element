import { Player } from "@lordicon/web";
import { Element, Trigger, defineElement } from "../src";

class InScreen implements Trigger {
    player: Player;
    element: HTMLElement;
    targetElement: HTMLElement;
    observer: IntersectionObserver;

    constructor(player: Player, element: HTMLElement, targetElement: HTMLElement) {
        this.player = player;
        this.element = element;
        this.targetElement = targetElement;

        const intersectionCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
            entries.forEach((entry) => {
                if (!this.player.playing) {
                    this.player.playFromStart();
                }
            });
        };

        this.observer = new IntersectionObserver(intersectionCallback, {
            threshold: 0.75,
        });
    }

    onReady() {
        this.observer.observe(this.targetElement);
    }

    onDisconnected() {
        this.observer.disconnect();
    }
}

Element.defineTrigger("in-screen", InScreen);

defineElement();
