import { describe, expect, it, vi } from 'vitest';
import { parseSteps } from './parser.ts';

describe('parseSteps', () => {
    it('reads every kind of step', () => {
        expect(
            parseSteps('play in-reveal, play, play morph-x reverse, wait 500, show end, stop'),
        ).toEqual([
            { kind: 'play', state: 'in-reveal', part: 'all' },
            { kind: 'play', state: null, part: 'all' },
            { kind: 'play', state: 'morph-x', part: 'reverse' },
            { kind: 'wait', ms: 500 },
            { kind: 'show', state: null, frame: 'end' },
            { kind: 'stop' },
        ]);
    });

    it('reads the parts of a play and the frames of a show', () => {
        expect(
            parseSteps('play morph-x there, play back, play 0-30, play hover-jump 30-end'),
        ).toEqual([
            { kind: 'play', state: 'morph-x', part: 'there' },
            { kind: 'play', state: null, part: 'back' },
            { kind: 'play', state: null, part: { from: 0, to: 30 } },
            { kind: 'play', state: 'hover-jump', part: { from: 30, to: 'end' } },
        ]);
        expect(parseSteps('show morph-x there, show 12, show in-reveal start')).toEqual([
            { kind: 'show', state: 'morph-x', frame: 'there' },
            { kind: 'show', state: null, frame: 12 },
            { kind: 'show', state: 'in-reveal', frame: 'start' },
        ]);
    });

    it('takes extra spaces and upper-case verbs', () => {
        expect(parseSteps('  PLAY   in-reveal ,Wait 10,, ')).toEqual([
            { kind: 'play', state: 'in-reveal', part: 'all' },
            { kind: 'wait', ms: 10 },
        ]);
    });

    it('skips a step it cannot read, with a warning', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(
            parseSteps('play a b, show, show a b c, wait, wait soon, stop now, jump, play'),
        ).toEqual([{ kind: 'play', state: null, part: 'all' }]);
        expect(warn).toHaveBeenCalledTimes(7);
        warn.mockRestore();
    });

    it('returns nothing for an empty value', () => {
        expect(parseSteps('  ')).toEqual([]);
    });
});
