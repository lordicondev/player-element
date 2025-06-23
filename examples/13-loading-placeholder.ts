import { defineElement, Element } from "../src";

// Initializes the custom element and loads the icon data.
function initElement() {
    // Register the element.
    defineElement();

    document.querySelectorAll<Element>("lord-icon").forEach(async (element) => {
        const iconName = element.dataset.icon;

        const iconRequest = await fetch(`/icons/${iconName}.json`);
        const iconData = await iconRequest.json();

        element.icon = iconData;
    });
}

(async () => {
    // Simulate loading delay for icons (in real world loading this library or icons may take a while).
    setTimeout(() => {
        initElement();
    }, 1000);
})();
