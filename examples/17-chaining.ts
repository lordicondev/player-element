import type { LordIconElement } from '../src/index.ts';
import '../src/standalone.ts';

const icon = document.querySelector<LordIconElement>('#icon')!;
const now = document.querySelector<HTMLElement>('#now')!;
let next: string | null = null;

function play(state: string): void {
    now.textContent = state;
    void icon.play({ state });
}

// Whatever finished, go on with what the pointer asked for, or the loop.
icon.addEventListener('complete', () => {
    play(next ?? 'loop-spin');
    next = null;
});
icon.addEventListener('pointerenter', () => (next = 'hover-jump'));

play('in-reveal');
