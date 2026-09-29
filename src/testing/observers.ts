import { vi } from 'vitest';

type Instance = { callback: IntersectionObserverCallback; targets: Set<Element> };

/** Replaces IntersectionObserver with a stub the test can fire. Returns a `show(element)`. */
export function stubIntersectionObserver() {
    const instances: Instance[] = [];

    class Stub {
        callback: IntersectionObserverCallback;
        targets = new Set<Element>();

        constructor(callback: IntersectionObserverCallback) {
            this.callback = callback;
            instances.push(this);
        }

        observe(element: Element) {
            this.targets.add(element);
        }

        unobserve(element: Element) {
            this.targets.delete(element);
        }

        disconnect() {
            this.targets.clear();
        }

        takeRecords() {
            return [];
        }
    }

    vi.stubGlobal('IntersectionObserver', Stub);

    return {
        instances,
        /** Reports `element` as visible to every observer watching it. */
        show(element: Element) {
            for (const instance of [...instances]) {
                if (!instance.targets.has(element)) continue;
                const entry = {
                    isIntersecting: true,
                    target: element,
                } as IntersectionObserverEntry;
                instance.callback([entry], instance as unknown as IntersectionObserver);
            }
        },
        /** How many observers are still watching `element`. */
        watching(element: Element) {
            return instances.filter((instance) => instance.targets.has(element)).length;
        },
    };
}
