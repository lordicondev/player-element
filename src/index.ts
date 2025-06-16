import { Element } from './element';
import { Player } from '@lordicon/web';
import { Boomerang, Click, Hover, In, Loop, LoopOnHover, Morph, Sequence } from './triggers';

export { Boomerang, Click, Element, Hover, In, Loop, LoopOnHover, Morph, Sequence, Player };

export * from "./interfaces";

/**
 * Registers the `lord-icon` custom element and attaches all built-in animation triggers.
 *
 * This function should be called once in your application before using the `<lord-icon>` element in your markup.
 * It registers the following triggers:
 * - `in`
 * - `click`
 * - `hover`
 * - `loop`
 * - `loop-on-hover`
 * - `morph`
 * - `boomerang`
 * - `sequence`
 *
 * ## Example usage in JavaScript:
 * ```js
 * import { defineElement } from '@lordicon/element';
 * defineElement();
 * ```
 *
 * ## Example usage in HTML (after calling `defineElement`):
 * ```html
 * <lord-icon trigger="hover" src="/icons/confetti.json"></lord-icon>
 * ```
 */
export function defineElement() {
    Element.defineTrigger('in', In);
    Element.defineTrigger('click', Click);
    Element.defineTrigger('hover', Hover);
    Element.defineTrigger('loop', Loop);
    Element.defineTrigger('loop-on-hover', LoopOnHover);
    Element.defineTrigger('morph', Morph);
    Element.defineTrigger('boomerang', Boomerang);
    Element.defineTrigger('sequence', Sequence);

    // Register the custom element if it hasn't been registered yet
    if (!customElements.get || !customElements.get('lord-icon')) {
        customElements.define('lord-icon', Element);
    }
}