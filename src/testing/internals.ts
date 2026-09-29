/** What the element set on its internals: its states, and its default role and aria-hidden. */
export type FakeInternals = {
    states: Set<string>;
    role: string | null;
    ariaHidden: string | null;
};

/**
 * Gives elements created from now on `attachInternals()`, which happy-dom lacks, and lets
 * a test read what each element set on it. Returns the lookup and the undo.
 */
export function useInternals() {
    const proto = HTMLElement.prototype as { attachInternals?: () => ElementInternals };
    const original = proto.attachInternals;
    const created = new WeakMap<object, FakeInternals>();

    proto.attachInternals = function (this: HTMLElement) {
        const internals: FakeInternals = { states: new Set(), role: null, ariaHidden: null };
        created.set(this, internals);
        return internals as unknown as ElementInternals;
    };

    return {
        of(element: Element): FakeInternals {
            const found = created.get(element);
            if (!found) throw new Error('No internals: was the element created before?');
            return found;
        },
        restore() {
            if (original) proto.attachInternals = original;
            else delete proto.attachInternals;
        },
    };
}
