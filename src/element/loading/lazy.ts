/**
 * Resolves once the element is in the viewport, by at least `threshold` of its area.
 * Rejects when the signal aborts first.
 */
export function whenVisible(element: Element, signal: AbortSignal, threshold = 0): Promise<void> {
    return new Promise((resolve, reject) => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                resolve();
            },
            { threshold },
        );

        observer.observe(element);
        signal.addEventListener(
            'abort',
            () => {
                observer.disconnect();
                reject(signal.reason);
            },
            { once: true },
        );
    });
}
