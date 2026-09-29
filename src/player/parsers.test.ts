import { describe, expect, it, vi } from 'vitest';
import { parseColors, parseStroke } from './parsers.ts';

describe('parseColors', () => {
    it('parses name:value pairs', () => {
        expect(parseColors('primary:red, Secondary:#03a9f4')).toEqual({
            primary: '#ff0000',
            secondary: '#03a9f4',
        });
    });

    it('warns about and skips an unknown colour', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(parseColors('primary:nope,secondary:blue')).toEqual({ secondary: '#0000ff' });
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });

    it('is null when nothing is left', () => {
        expect(parseColors('')).toBeNull();
        expect(parseColors(null)).toBeNull();
        expect(parseColors('garbage')).toBeNull();
    });
});

describe('parseStroke', () => {
    it('accepts names and numbers', () => {
        expect(parseStroke('light')).toBe(1);
        expect(parseStroke('Regular')).toBe(2);
        expect(parseStroke('bold')).toBe(3);
        expect(parseStroke('2')).toBe(2);
    });

    it('is null for anything else', () => {
        expect(parseStroke('20')).toBeNull();
        expect(parseStroke(null)).toBeNull();
    });
});
