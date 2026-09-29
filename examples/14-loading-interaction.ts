import type { LordIconElement } from '../src/index.ts';

const icon = document.querySelector<LordIconElement>('#on-demand')!;

// The icon waits for a pointer on itself; the button loads it from elsewhere on the page.
document.querySelector('#load')!.addEventListener('click', async () => {
    if (await icon.load()) void icon.play({ from: 'start' });
});
