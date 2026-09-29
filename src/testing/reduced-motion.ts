/**
 * Pretends the viewer asked for reduced motion (or not). Returns the undo, with `change()`
 * to switch the preference later and notify listeners, as the browser does.
 */
export function withReducedMotion(reduce: boolean): (() => void) & {
    change: (reduce: boolean) => void;
} {
    const original = globalThis.matchMedia;
    const listeners = new Set<() => void>();
    let current = reduce;

    globalThis.matchMedia = ((query: string) =>
        ({
            get matches() {
                return current && query.includes('prefers-reduced-motion');
            },
            media: query,
            addEventListener(
                _type: string,
                listener: () => void,
                options?: AddEventListenerOptions,
            ) {
                listeners.add(listener);
                options?.signal?.addEventListener('abort', () => listeners.delete(listener));
            },
            removeEventListener(_type: string, listener: () => void) {
                listeners.delete(listener);
            },
        }) as unknown as MediaQueryList) as typeof globalThis.matchMedia;

    const undo = () => {
        globalThis.matchMedia = original;
    };

    return Object.assign(undo, {
        change(next: boolean) {
            current = next;
            for (const listener of [...listeners]) listener();
        },
    });
}
