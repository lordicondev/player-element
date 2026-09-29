import type { IconData } from '../types.ts';

/** Fetches Lottie JSON. Rejects on a failed response or invalid JSON; aborts with the signal. */
export async function loadIcon(src: string, signal: AbortSignal): Promise<IconData> {
    const response = await fetch(src, { signal });

    if (!response.ok) {
        throw new Error(`Could not load icon ${src}: ${response.status} ${response.statusText}`);
    }

    try {
        return (await response.json()) as IconData;
    } catch (cause) {
        throw new Error(`Icon ${src} is not valid JSON`, { cause });
    }
}
