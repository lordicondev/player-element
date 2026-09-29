/** Resolves after `ms`. Rejects when the signal aborts first. */
export function wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const id = setTimeout(resolve, ms);
        signal.addEventListener(
            'abort',
            () => {
                clearTimeout(id);
                reject(signal.reason);
            },
            { once: true },
        );
    });
}
