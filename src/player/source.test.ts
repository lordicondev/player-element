import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../testing/element.ts';
import { iconData } from '../testing/icon.ts';
import { loadIcon } from './source.ts';

afterEach(() => vi.unstubAllGlobals());

describe('loadIcon', () => {
    it('returns the parsed JSON', async () => {
        stubFetch();
        await expect(loadIcon('/lock.json', new AbortController().signal)).resolves.toEqual(
            iconData(),
        );
    });

    it('rejects a failed response', async () => {
        stubFetch(iconData(), 404);
        await expect(loadIcon('/lock.json', new AbortController().signal)).rejects.toThrow(/404/);
    });

    it('rejects invalid JSON', async () => {
        stubFetch(null);
        await expect(loadIcon('/lock.json', new AbortController().signal)).rejects.toThrow(
            /not valid JSON/,
        );
    });

    it('passes the signal to fetch', async () => {
        const fetch = stubFetch();
        const controller = new AbortController();
        await loadIcon('/lock.json', controller.signal);
        expect(fetch.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });
});
