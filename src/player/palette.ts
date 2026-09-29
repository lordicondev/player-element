import type { ColorMap } from '@lordicon/web';

/** Writes the icon's current colours as `--lord-icon-<name>-base` on the container. */
export function syncPalette(container: HTMLElement, colors: ColorMap | null): void {
    for (const [name, value] of Object.entries(colors ?? {})) {
        if (value) container.style.setProperty(`--lord-icon-${name}-base`, String(value));
        else container.style.removeProperty(`--lord-icon-${name}-base`);
    }
}
