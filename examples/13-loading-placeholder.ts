import { defineElement, Element } from "../src";

const ICONS = {};

// Loads all required icons and stores them in the ICONS object.
async function loadIcons() {
    for (const icon of ["lock", "puzzle", "coins"]) {
        const response = await fetch(`/icons/${icon}.json`);
        const data = await response.json();

        ICONS[icon] = data;
    }
}

// Initializes the custom element and sets up the icon loader.
function initElement() {
    // Custom icon loader that can provide icon data from any source.
    Element.setIconLoader((iconName) => {
        return ICONS[iconName];
    });

    // Register the element.
    defineElement();
}

(async () => {
    await loadIcons();

    // Simulate loading delay for icons (in real world loading this library or icons may take a while).
    setTimeout(() => {
        initElement();
    }, 1000);
})();
