import { Player } from "@lordicon/web";
import { Element, Trigger, defineElement } from "../src";

class Trash implements Trigger {
    player: Player;
    element: HTMLElement;
    targetElement: HTMLElement;
    empty: boolean;

    constructor(player: Player, element: HTMLElement, targetElement: HTMLElement) {
        this.player = player;
        this.element = element;
        this.targetElement = targetElement;

        this.empty = true;

        this.onClick = this.onClick.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    onConnected() {
        this.targetElement.addEventListener("click", this.onClick);
        this.targetElement.addEventListener("mouseenter", this.onMouseEnter);
        this.targetElement.addEventListener("mouseleave", this.onMouseLeave);
    }

    onDisconnected() {
        this.targetElement.removeEventListener("click", this.onClick);
        this.targetElement.removeEventListener("mouseenter", this.onMouseEnter);
        this.targetElement.removeEventListener("mouseleave", this.onMouseLeave);
    }

    onReady() {
        this.player.state = "in-trash-empty";
        this.player.playFromStart();
    }

    onClick() {
        if (this.empty) {
            this.player.state = "morph-trash-full";
            this.empty = false;
        } else {
            this.player.state = "morph-trash-full-to-empty";
            this.empty = true;
        }

        this.player.playFromStart();
    }

    onMouseEnter() {
        if (this.empty) {
            this.player.state = "hover-trash-empty";
        } else {
            this.player.state = "hover-trash-full";
        }

        this.player.playFromStart();
    }

    onMouseLeave() { }

    trashIntro() {
        this.player.state = "in-trash-empty";
        this.empty = true;
        this.player.playFromStart();
    }

    trashFill() {
        this.player.state = "morph-trash-full";
        this.empty = false;
        this.player.playFromStart();
    }

    trashErase() {
        this.player.state = "morph-trash-full-to-empty";
        this.empty = true;
        this.player.playFromStart();
    }
}

Element.defineTrigger("trash", Trash);

defineElement();

// Control the custom trigger.
const element = document.querySelector<Element>("lord-icon")!;
element.addEventListener("ready", () => {
    const triggerInstance = element.triggerInstance as Trash;

    document.getElementById("trash-intro")!.addEventListener("click", (e) => {
        e.preventDefault();
        triggerInstance.trashIntro();
    });

    document.getElementById("trash-fill")!.addEventListener("click", (e) => {
        e.preventDefault();
        triggerInstance.trashFill();
    });

    document.getElementById("trash-erase")!.addEventListener("click", (e) => {
        e.preventDefault();
        triggerInstance.trashErase();
    });
});
