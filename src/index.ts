import { LordIconElement } from './element/element.ts';
import { BUILTIN_TRIGGERS } from './triggers/builtin.ts';
import type { TriggerConstructor } from './triggers/types.ts';
import type { MotionMode } from './types.ts';

export { LordIconElement } from './element/element.ts';
export { BaseTrigger } from './triggers/base.ts';
export { parseTrigger, type TriggerSpec } from './triggers/params.ts';
export {
    defaultState,
    findState,
    splitSegment,
    stateEndFrame,
    stateRatio,
    stateSegment,
    stateType,
} from '@lordicon/web';
export type { Command, Trigger, TriggerConstructor, TriggerContext } from './triggers/types.ts';
export { Boomerang } from './triggers/boomerang.ts';
export { Click } from './triggers/click.ts';
export { Follow } from './triggers/follow/index.ts';
export { Hover } from './triggers/hover.ts';
export { In } from './triggers/in.ts';
export { Loop } from './triggers/loop.ts';
export { LoopOnHover } from './triggers/loop-on-hover.ts';
export { Morph } from './triggers/morph.ts';
export { Morpher } from './triggers/morpher.ts';
export { Sequence } from './triggers/sequence/index.ts';
export { whenVisible } from './element/loading/lazy.ts';
export type {
    ColorMap,
    CompleteDetail,
    IconData,
    IconProperties,
    IconState,
    LoadingStrategy,
    LordIconEventMap,
    MotionMode,
    PlaybackDirection,
    PlayOptions,
    Player,
    PlayerFactory,
    Segment,
    Stroke,
} from './types.ts';

export type DefineOptions = {
    /** The tag name. Default `lord-icon`. */
    tag?: string;
    /**
     * Extra triggers, or replacements for built-in ones, by name. A replacement stays through
     * later calls.
     */
    triggers?: Record<string, TriggerConstructor>;
    /**
     * `always` animates even when the viewer asked for less motion. Default `auto`. Applies to
     * every tag; a later call without it leaves it as it is.
     */
    motion?: MotionMode;
    /** The class to define: a subclass of `LordIconElement`, with loading of its own say. */
    element?: typeof LordIconElement;
};

/** The classes defined under a tag already. */
const defined = new WeakSet<typeof LordIconElement>();

/**
 * Registers the built-in triggers and defines the element. Safe to call more than once, and
 * without a DOM (on a server), where it does nothing.
 */
export function defineElement(options: DefineOptions = {}): void {
    if (typeof customElements === 'undefined') return;

    const { tag = 'lord-icon', triggers = {}, motion, element = LordIconElement } = options;

    // Only when given: a later call without it (from another module, say) keeps it.
    if (motion) LordIconElement.motion = motion;
    // Built-in triggers fill in names not taken yet: a trigger the page put in their place
    // stays, whichever call comes first. The page's own always go in.
    for (const [name, trigger] of Object.entries(BUILTIN_TRIGGERS)) {
        if (!LordIconElement.resolveTrigger(name)) LordIconElement.defineTrigger(name, trigger);
    }
    for (const [name, trigger] of Object.entries(triggers)) {
        LordIconElement.defineTrigger(name, trigger);
    }

    if (customElements.get(tag)) return;

    // A class can be defined under one tag only; a second tag gets a subclass.
    customElements.define(tag, defined.has(element) ? class extends element {} : element);
    defined.add(element);
}

declare global {
    interface HTMLElementTagNameMap {
        'lord-icon': LordIconElement;
    }
}
