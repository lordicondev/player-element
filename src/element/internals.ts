/** Where the icon is on its way to the screen, as CSS sees it: `lord-icon:state(ready)`. */
export type Phase = 'waiting' | 'loading' | 'ready' | 'error';

const PHASES: readonly Phase[] = ['waiting', 'loading', 'ready', 'error'];

/**
 * The element's internals, where the browser has them: its states for CSS, and the
 * semantics assistive technology gets unless the page sets its own. Without them, both do
 * nothing.
 */
export class Internals {
    #internals: ElementInternals | null;

    constructor(element: HTMLElement) {
        this.#internals = attach(element);
        this.named(false);
    }

    /** Sets the phase, clearing the others; null for none (nothing to show, or unloaded). */
    phase(phase: Phase | null): void {
        for (const name of PHASES) this.#toggle(name, name === phase);
    }

    /** The intro is under way, from ready until it has played or was cut short. */
    intro(on: boolean): void {
        this.#toggle('intro', on);
    }

    /** The player plays, as its `play` and `pause` events tell. */
    playing(on: boolean): void {
        this.#toggle('playing', on);
    }

    /**
     * An icon with a name (`aria-label`) is an image; one without is decoration, hidden
     * from assistive technology. The page's own `role` and `aria-hidden` win over both.
     */
    named(named: boolean): void {
        const internals = this.#internals;
        if (!internals) return;
        internals.role = named ? 'img' : null;
        internals.ariaHidden = named ? null : 'true';
    }

    #toggle(name: string, on: boolean): void {
        const states = this.#internals?.states;
        if (!states) return;

        try {
            if (on) states.add(name);
            else states.delete(name);
        } catch {
            // Browsers that take only `--name` states: CSS cannot see them there.
        }
    }
}

function attach(element: HTMLElement): ElementInternals | null {
    try {
        return element.attachInternals?.() ?? null;
    } catch {
        return null;
    }
}
