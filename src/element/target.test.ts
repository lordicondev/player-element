import { describe, expect, it } from 'vitest';
import { findTarget } from './target.ts';

describe('findTarget', () => {
    it('finds the closest matching ancestor', () => {
        const button = document.createElement('button');
        button.className = 'toggle';
        const icon = document.createElement('span');
        button.append(icon);

        expect(findTarget(icon, '.toggle')).toBe(button);
        expect(findTarget(icon, '.other')).toBeNull();
    });

    it('continues from a shadow host', () => {
        const button = document.createElement('button');
        button.className = 'toggle';
        const host = document.createElement('div');
        button.append(host);
        const root = host.attachShadow({ mode: 'open' });
        const icon = document.createElement('span');
        root.append(icon);

        expect(findTarget(icon, '.toggle')).toBe(button);
    });
});
