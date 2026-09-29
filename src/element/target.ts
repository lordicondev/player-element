/**
 * The element a `target` selector names: the closest matching ancestor. When the icon sits
 * in a shadow tree, the search continues from the shadow host upwards.
 */
export function findTarget(element: HTMLElement, selector: string): HTMLElement | null {
    const closest = element.closest<HTMLElement>(selector);
    if (closest) return closest;

    let node: Node | null = element;

    while (node) {
        const root = node.getRootNode();
        if (!(root instanceof ShadowRoot)) return null;

        const found = root.host.closest<HTMLElement>(selector);
        if (found) return found;

        node = root.host;
    }

    return null;
}
