import { Boomerang } from './boomerang.ts';
import { Click } from './click.ts';
import { Follow } from './follow/index.ts';
import { Hover } from './hover.ts';
import { In } from './in.ts';
import { Loop } from './loop.ts';
import { LoopOnHover } from './loop-on-hover.ts';
import { Morph } from './morph.ts';
import { Sequence } from './sequence/index.ts';
import type { TriggerConstructor } from './types.ts';

/** The triggers `defineElement()` registers. */
export const BUILTIN_TRIGGERS: Record<string, TriggerConstructor> = {
    in: In,
    click: Click,
    follow: Follow,
    hover: Hover,
    loop: Loop,
    'loop-on-hover': LoopOnHover,
    boomerang: Boomerang,
    morph: Morph,
    sequence: Sequence,
};
