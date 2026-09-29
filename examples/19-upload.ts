import type { LordIconElement } from '../src/index.ts';
import '../src/standalone.ts';

const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
const icon = document.querySelector<LordIconElement>('#icon')!;

input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
        icon.icon = undefined;
        return;
    }

    try {
        icon.icon = JSON.parse(await file.text());
    } catch {
        alert('That file is not a Lottie animation.');
    }
});
