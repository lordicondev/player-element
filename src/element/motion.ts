import type { MotionMode } from '../types.ts';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the icon should hold back its animation: the viewer asked for less motion, and
 * neither the element (`motion="always"`) nor `defineElement({ motion: 'always' })` opted out.
 */
export function reducedMotion(elementMode: MotionMode | null, globalMode: MotionMode): boolean {
    const mode = elementMode ?? globalMode;
    if (mode === 'always') return false;

    return globalThis.matchMedia?.(QUERY).matches ?? false;
}

/** Calls `onChange` when the viewer's motion preference changes, until the signal aborts. */
export function onMotionChange(onChange: () => void, signal: AbortSignal): void {
    const query = globalThis.matchMedia?.(QUERY);
    query?.addEventListener?.('change', onChange, { signal });
}
