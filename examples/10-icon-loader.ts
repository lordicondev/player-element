import { Element, defineElement } from "../src";

// List of icons supported by our icon loader.
const ICONS = {
    first: "/icons/lock.json",
    second: "/icons/puzzle.json",
};

// Custom icon loader that can provide icon data from any source.
// In this example, our loader fetches icon data from the provided URL.
Element.setIconLoader(async (iconName) => {
    const response = await fetch(ICONS[iconName]);
    return await response.json();
});

// Register the element.
defineElement();
