import {
    parseStroke as strokeWidth,
    resolveColor,
    type ColorMap,
    type Stroke,
} from '@lordicon/web';

/**
 * Parses the `colors` attribute: `primary:red,secondary:#03a9f4`. A pair with an unknown
 * colour is skipped with a warning. Null when nothing valid is left.
 */
export function parseColors(value: string | null): ColorMap | null {
    if (!value) return null;

    const colors: Record<string, string> = {};

    for (const pair of value.split(',')) {
        const [name, color] = pair.split(':').map((part) => part.trim());
        if (!name || !color) continue;

        const parsed = resolveColor(color);
        if (parsed) colors[name.toLowerCase()] = parsed;
        else console.warn(`lord-icon: unknown colour "${color}" for "${name}"`);
    }

    return Object.keys(colors).length ? (colors as ColorMap) : null;
}

/** Parses the `stroke` attribute: `light`, `regular`, `bold` or 1–3. Null otherwise. */
export function parseStroke(value: string | null): Stroke | null {
    return value === null ? null : strokeWidth(value);
}
