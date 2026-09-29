import { vi } from 'vitest';
import { LordIconElement } from '../element/element.ts';
import type { IconData, IconProperties } from '../types.ts';
import { defineForTests } from './context.ts';
import { iconData } from './icon.ts';
import { playerStub, type StubOptions, type StubPlayer } from './player-stub.ts';

/**
 * Every player the factory has created since `useStubPlayer()`, the last one as `player`,
 * and the properties each was created with.
 */
export type StubFactory = {
    created: StubPlayer[];
    properties: IconProperties[];
    readonly player: StubPlayer;
};

/** Replaces the element's player factory with one that hands out stubs. Returns the undo. */
export function useStubPlayer(options: StubOptions = {}): StubFactory & { restore: () => void } {
    const original = LordIconElement.playerFactory;
    const created: StubPlayer[] = [];
    const given: IconProperties[] = [];

    LordIconElement.playerFactory = (_container, _data, properties) => {
        const stub = playerStub({ ...options, state: properties.state ?? options.state ?? null });
        created.push(stub);
        given.push(properties);
        return stub;
    };

    return {
        created,
        properties: given,
        get player() {
            return created[created.length - 1];
        },
        restore: () => {
            LordIconElement.playerFactory = original;
        },
    };
}

/** A fetch stub that serves `data` for every URL (or fails with `status`). */
export function stubFetch(
    data: IconData | null = iconData(),
    status = 200,
): ReturnType<typeof vi.fn> {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 200 ? 'OK' : 'Not Found',
            json: async () => {
                if (data === null) throw new SyntaxError('Unexpected token');
                return data;
            },
        };
    });
    vi.stubGlobal('fetch', fetch);
    return fetch;
}

/** Creates a `<lord-icon>` with attributes and connects it. */
export function mount(attributes: Record<string, string> = {}): LordIconElement {
    defineForTests();

    const element = document.createElement('lord-icon');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    document.body.append(element);
    return element;
}

/** Lets pending promises and timers settle. */
export function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Marks the stub player ready and raises its `ready` event, then waits for the element. */
export async function becomeReady(player: StubPlayer): Promise<void> {
    player.ready = true;
    player.emit('ready');
    await settle();
}
