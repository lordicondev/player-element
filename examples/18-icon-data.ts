import type { IconData, LordIconElement } from '../src/index.ts';
import '../src/standalone.ts';

const icon = document.querySelector<LordIconElement>('#icon')!;
const icons: IconData[] = [
    await (await fetch('/icons/lock.json')).json(),
    await (await fetch('/icons/puzzle.json')).json(),
];

let index = 0;
icon.icon = icons[index];

setInterval(() => {
    index = (index + 1) % icons.length;
    icon.icon = icons[index];
}, 2000);
