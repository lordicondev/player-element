import { BaseTrigger, defineElement } from '../src/index.ts';

/** Moves the animation with the page scroll: one round per screen. */
class Scroll extends BaseTrigger {
    onReady() {
        this.listen(document, 'scroll', () => this.scrub());
        this.scrub();
    }

    scrub() {
        this.player.progress = (window.scrollY / window.innerHeight) % 1;
    }
}

defineElement({ triggers: { scroll: Scroll } });
