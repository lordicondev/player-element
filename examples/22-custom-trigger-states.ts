import {
    BaseTrigger,
    defineElement,
    type LordIconElement,
    type TriggerContext,
} from '../src/index.ts';

/** A trash can: a click fills or empties it, a hover nudges it the way that fits. */
class Trash extends BaseTrigger {
    full = false;

    constructor(context: TriggerContext) {
        super(context);
        this.listen(this.target, 'click', () => {
            this.full = !this.full;
            void this.player.play({
                state: this.full ? 'morph-trash-full' : 'morph-trash-full-to-empty',
            });
        });
        this.listen(this.target, 'pointerenter', () => {
            void this.player.play({ state: this.full ? 'hover-trash-full' : 'hover-trash-empty' });
        });
    }

    onReady() {
        void this.player.play({ state: 'in-trash-empty' });
    }
}

defineElement({ triggers: { trash: Trash } });

// The same states from outside, through the element's own methods.
const trash = document.querySelector<LordIconElement>('#trash')!;
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-state]')) {
    button.addEventListener('click', () => void trash.play({ state: button.dataset.state }));
}
