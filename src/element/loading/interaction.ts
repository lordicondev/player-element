/**
 * What loads an icon with `loading="interaction"`: the pointer, a click, and focus. Focus is
 * heard in the capture phase, so a field inside the target counts, and a keyboard user gets
 * the icon before the key that changes it.
 */
const EVENTS = ['pointerenter', 'click', 'focus'] as const;

/** An interaction on the target, from its first event until the icon is ready. */
export interface Interaction {
    /** The target's attributes at the first event, before any listener of the page ran. */
    readonly attributes: ReadonlyMap<string, string>;
    /**
     * Stops listening, and gives what happened since, the first event included: the latest
     * event of each type, in the order they came. A `pointerenter` goes when the pointer has
     * left since.
     */
    end(): Event[];
}

/**
 * Resolves at the first interaction on the target, then goes on hearing the target until
 * `end()`. Rejects when the signal aborts before the first event.
 */
export function firstInteraction(target: Element, signal: AbortSignal): Promise<Interaction> {
    return new Promise((resolve, reject) => {
        const listening = new AbortController();
        const heard = new Map<string, Event>();
        let started = false;

        const hear = (event: Event) => {
            heard.delete(event.type);
            heard.set(event.type, event);
            if (started) return;

            started = true;
            resolve({
                attributes: new Map([...target.attributes].map(({ name, value }) => [name, value])),
                end: () => {
                    listening.abort();
                    return [...heard.values()];
                },
            });
        };

        for (const type of EVENTS) {
            target.addEventListener(type, hear, {
                capture: type === 'focus',
                signal: listening.signal,
            });
        }
        target.addEventListener('pointerleave', () => heard.delete('pointerenter'), {
            signal: listening.signal,
        });

        signal.addEventListener(
            'abort',
            () => {
                if (started) return;
                listening.abort();
                reject(signal.reason);
            },
            { once: true },
        );
    });
}
