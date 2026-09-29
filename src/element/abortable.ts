/** Settles with `promise`, or rejects with the signal's reason when it aborts first. */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        promise.then(resolve, reject);
    });
}
