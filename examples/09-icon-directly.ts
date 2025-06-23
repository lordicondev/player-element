import { Element } from '../src';
import '../src/release';

async function loadIcon(iconName) {
    const response = await fetch(`/icons/${iconName}.json`);
    return await response.json();
}

const icons = [
    await loadIcon("lock"),
    await loadIcon("puzzle"),
]

const element = document.querySelector<Element>("lord-icon")!;

// Index of the currently displayed icon.
let index = 0;

// Assigning icon.
element.icon = icons[index];

// Change the icon every 2 seconds.
setInterval(() => {
    index += 1;
    if (index >= icons.length) {
        index = 0;
    }
    element.icon = icons[index];
}, 2000);
