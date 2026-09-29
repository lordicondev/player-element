import { describe, expect, it, vi } from 'vitest';
import { parseParams, parseTrigger } from './params.ts';

describe('parseTrigger', () => {
    it('reads a bare name', () => {
        expect(parseTrigger('hover')).toEqual({ name: 'hover', options: {} });
    });

    it('reads named options', () => {
        expect(parseTrigger('loop(delay=1000)')).toEqual({
            name: 'loop',
            options: { delay: '1000' },
        });
    });

    it('lets a value contain spaces, and commas not followed by a key', () => {
        expect(parseTrigger('sequence(steps=play intro, wait 500, play intro reverse)')).toEqual({
            name: 'sequence',
            options: { steps: 'play intro, wait 500, play intro reverse' },
        });
    });

    it('splits several options, trimming whitespace', () => {
        expect(
            parseTrigger(' follow( attr=data-stage , busy=loop-cycle, done=morph-check ) '),
        ).toEqual({
            name: 'follow',
            options: { attr: 'data-stage', busy: 'loop-cycle', done: 'morph-check' },
        });
    });

    it('allows an empty value', () => {
        expect(parseTrigger('follow(attr=data-stage, idle=)')?.options).toEqual({
            attr: 'data-stage',
            idle: '',
        });
    });

    it('returns null for nothing', () => {
        expect(parseTrigger(null)).toBeNull();
        expect(parseTrigger('')).toBeNull();
    });

    it('warns and returns null for a malformed value', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(parseTrigger('loop(')).toBeNull();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('reads a first value without a name', () => {
        expect(parseTrigger('loop(1000)')).toEqual({
            name: 'loop',
            primary: '1000',
            options: {},
        });
        expect(parseTrigger('follow(data-stage, busy=loop-cycle, done=morph-check)')).toEqual({
            name: 'follow',
            primary: 'data-stage',
            options: { busy: 'loop-cycle', done: 'morph-check' },
        });
        expect(parseTrigger('sequence(play intro, wait 500)')?.primary).toBe(
            'play intro, wait 500',
        );
    });

    it('ignores a pair with an empty key', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(parseTrigger('loop(=1000)')).toEqual({ name: 'loop', options: {} });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('parseParams', () => {
    it('reads a list without a trigger name', () => {
        expect(parseParams('')).toEqual({ options: {} });
        expect(parseParams('hover-pinch')).toEqual({ primary: 'hover-pinch', options: {} });
        expect(parseParams('after=.alert')).toEqual({ options: { after: '.alert' } });
        expect(parseParams('hover-pinch, after=.alert, delay=300')).toEqual({
            primary: 'hover-pinch',
            options: { after: '.alert', delay: '300' },
        });
    });

    it('keeps a comma inside a value that no key follows', () => {
        expect(parseParams('after=.card, .panel')).toEqual({
            options: { after: '.card, .panel' },
        });
    });
});
