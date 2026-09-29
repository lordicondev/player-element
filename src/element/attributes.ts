import type { LoadingStrategy, MotionMode } from '../types.ts';

/** Attributes the element reacts to after it is connected. */
export const OBSERVED = [
    'src',
    'state',
    'trigger',
    'target',
    'colors',
    'stroke',
    'speed',
    'aria-label',
    'aria-labelledby',
    // Read when the icon loads; observed to warn about a change after that.
    'intro',
    'loading',
    'motion',
] as const;

export type ObservedAttribute = (typeof OBSERVED)[number];

/** `speed="1.5"`; anything else is 1. */
export function parseSpeed(value: string | null): number {
    const speed = parseFloat(value ?? '');
    return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

/** `loading="lazy" | "interaction" | "delay:500"`; anything else loads at once. */
export function parseLoading(value: string | null): LoadingStrategy {
    const [kind, argument] = (value ?? '').trim().toLowerCase().split(':');

    if (kind === 'lazy' || kind === 'interaction') return { kind };
    if (kind === 'delay') return { kind, ms: Math.max(0, parseInt(argument ?? '', 10) || 0) };
    return { kind: 'eager' };
}

/** `motion="always"` opts one icon out of reduced-motion handling; anything else is `auto`. */
export function parseMotion(value: string | null): MotionMode | null {
    if (value === null) return null;
    return value.trim().toLowerCase() === 'always' ? 'always' : 'auto';
}
