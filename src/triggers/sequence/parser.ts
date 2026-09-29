/** Which part of a state a `play` step plays. A range counts frames from the state's start. */
export type Part = 'all' | 'reverse' | 'there' | 'back' | { from: number; to: number | 'end' };

/** Which frame a `show` step shows. A number counts from the state's start. */
export type Frame = number | 'start' | 'end' | 'there';

/** One step of a sequence. A null `state` is the element's own. */
export type Step =
    | { kind: 'play'; state: string | null; part: Part }
    | { kind: 'show'; state: string | null; frame: Frame }
    | { kind: 'wait'; ms: number }
    | { kind: 'stop' };

const NUMBER = /^\d+$/;
const RANGE = /^(\d+)-(\d+|end)$/;
const PARTS = ['reverse', 'there', 'back'];
const FRAMES = ['start', 'end', 'there'];

/**
 * Parses the steps of the sequence trigger: separated by commas, each a verb and its words.
 *
 *     play in-reveal, wait 500, play hover-jump, play morph-x there, show morph-x end, stop
 *
 * - `play [state] [reverse | there | back | <from>-<to>]` plays a state, or part of it
 * - `show [state] <frame | start | end | there>` shows one frame and holds it
 * - `wait <ms>` pauses
 * - `stop` ends the script; without it the script repeats
 *
 * A step that cannot be read is skipped with a warning.
 */
export function parseSteps(value: string): Step[] {
    const steps: Step[] = [];

    for (const text of value.split(',')) {
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (!words.length) continue;

        const step = parseStep(words[0].toLowerCase(), words.slice(1));
        if (step) steps.push(step);
        else console.warn(`lord-icon: ignoring sequence step "${text.trim()}"`);
    }

    return steps;
}

function parseStep(verb: string, words: string[]): Step | null {
    switch (verb) {
        case 'play': {
            const part = words.length ? parsePart(words[words.length - 1]) : null;
            const state = part ? words.slice(0, -1) : words;
            if (state.length > 1) return null;
            return { kind: 'play', state: state[0] ?? null, part: part ?? 'all' };
        }
        case 'show': {
            const frame = parseFrame(words[words.length - 1]);
            if (frame === null || words.length > 2) return null;
            return { kind: 'show', state: words.length === 2 ? words[0] : null, frame };
        }
        case 'wait':
            return words.length === 1 && NUMBER.test(words[0])
                ? { kind: 'wait', ms: Number(words[0]) }
                : null;
        case 'stop':
            return words.length ? null : { kind: 'stop' };
        default:
            return null;
    }
}

function parsePart(word: string): Part | null {
    if (PARTS.includes(word)) return word as Part;

    const range = RANGE.exec(word);
    if (!range) return null;
    return { from: Number(range[1]), to: range[2] === 'end' ? 'end' : Number(range[2]) };
}

function parseFrame(word: string | undefined): Frame | null {
    if (word === undefined) return null;
    if (FRAMES.includes(word)) return word as Frame;
    return NUMBER.test(word) ? Number(word) : null;
}
