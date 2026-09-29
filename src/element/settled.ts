import { abortable } from './abortable.ts';

/**
 * Resolves once the element's own animations have finished. Waits a frame first: an
 * animation started together with the element shows up in `getAnimations()` one frame later.
 * Endless animations are left out, or this would never resolve. Rejects on abort.
 */
export async function settled(element: Element, signal: AbortSignal): Promise<void> {
    await abortable(new Promise((resolve) => requestAnimationFrame(resolve)), signal);

    const finite = (element.getAnimations?.() ?? []).filter(
        (animation) => animation.effect?.getComputedTiming().endTime !== Infinity,
    );
    await abortable(Promise.allSettled(finite.map((animation) => animation.finished)), signal);
}
