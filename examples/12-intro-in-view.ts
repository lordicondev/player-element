import type { LordIconElement } from '../src/index.ts';
import '../src/standalone.ts';

const icon = document.querySelector<LordIconElement>('#icon')!;

icon.addEventListener('ready', () => (document.querySelector('#ready')!.textContent = 'yes'));
icon.addEventListener('complete', () => (document.querySelector('#played')!.textContent = 'yes'), {
    once: true,
});
