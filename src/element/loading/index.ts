import type { LoadingStrategy } from '../../types.ts';
import { wait } from './delay.ts';
import { firstInteraction, type Interaction } from './interaction.ts';
import { whenVisible } from './lazy.ts';

export type { Interaction };

/**
 * Waits for the moment the `loading` attribute asks for. For `interaction`, gives the
 * interaction that ended the wait, still listening, so the element can hand what happened
 * to the trigger once the icon is ready.
 */
export async function waitForLoad(
    strategy: LoadingStrategy,
    element: HTMLElement,
    target: Element,
    signal: AbortSignal,
): Promise<Interaction | null> {
    switch (strategy.kind) {
        case 'lazy':
            await whenVisible(element, signal);
            return null;
        case 'interaction':
            return firstInteraction(target, signal);
        case 'delay':
            await wait(strategy.ms, signal);
            return null;
        default:
            return null;
    }
}
