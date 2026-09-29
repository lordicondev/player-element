import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LordIconElement } from '../element/element.ts';
import { becomeReady, mount, settle, stubFetch, useStubPlayer } from '../testing/element.ts';
import { BaseTrigger } from './base.ts';
import type { TriggerContext } from './types.ts';

/** Remembers the options of the last one created. */
class Probe extends BaseTrigger {
    static readonly primary = 'attr';
    static last: Record<string, string> = {};

    constructor(context: TriggerContext) {
        super(context);
        Probe.last = this.options;
    }
}

class Plain extends BaseTrigger {
    static last: Record<string, string> = {};

    constructor(context: TriggerContext) {
        super(context);
        Plain.last = this.options;
    }
}

let stub: ReturnType<typeof useStubPlayer>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    LordIconElement.defineTrigger('probe', Probe);
    LordIconElement.defineTrigger('plain', Plain);
    stub = useStubPlayer();
    stubFetch();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    stub.restore();
    warn.mockRestore();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

async function start(trigger: string): Promise<void> {
    mount({ src: '/lock.json', trigger });
    await settle();
    await becomeReady(stub.player);
}

describe('TriggerHost', () => {
    it('files a value without a name under the primary option', async () => {
        await start('probe(aria-expanded, ratio=0.6)');
        expect(Probe.last).toEqual({ attr: 'aria-expanded', ratio: '0.6' });
        expect(warn).not.toHaveBeenCalled();
    });

    it('lets the named option win and warns', async () => {
        await start('probe(aria-expanded, attr=data-open)');
        expect(Probe.last).toEqual({ attr: 'data-open' });
        expect(warn).toHaveBeenCalledOnce();
    });

    it('warns when the trigger has no primary option', async () => {
        await start('plain(1000)');
        expect(Plain.last).toEqual({});
        expect(warn).toHaveBeenCalledOnce();
    });
});
