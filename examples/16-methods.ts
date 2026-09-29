import type { LordIconElement } from '../src/index.ts';
import '../src/standalone.ts';

const icon = document.querySelector<LordIconElement>('#icon')!;
const frame = document.querySelector<HTMLElement>('#frame')!;
const events = document.querySelector<HTMLElement>('#events')!;

function log(line: string): void {
    events.textContent = `${line}\n${events.textContent}`;
}

icon.addEventListener('ready', () => log('ready'));
icon.addEventListener('state', (event) => log(`state: ${event.detail}`));
// The trigger starts after ready (and after the intro, when there is one).
icon.addEventListener('trigger', () => log(`trigger: ${icon.trigger}`));
// `detail` says which state played, and which way.
icon.addEventListener('complete', (event) => {
    const { state, direction } = event.detail;
    log(`complete: ${state}, ${direction > 0 ? 'forwards' : 'backwards'}`);
});

// Methods can be called before the icon is ready; they run once it is.
void icon.play({ state: 'in-reveal' });

document.querySelector('#play')!.addEventListener('click', () => icon.play());
document.querySelector('#pause')!.addEventListener('click', () => icon.pause());
document.querySelector('#forwards')!.addEventListener('click', () => {
    void icon.play({ state: 'morph-unlocked' });
});

// play() resolves true once the animation has played, false when something cut it short.
document.querySelector('#backwards')!.addEventListener('click', async () => {
    const finished = await icon.play({ state: 'morph-unlocked', reverse: true });
    log(finished ? 'played back' : 'cut short');
});

// The player is there for anything the element does not cover.
document.querySelector('#next-frames')!.addEventListener('click', () => {
    icon.player?.seek(icon.player.frame + 5);
});

await icon.readyPromise;
icon.player!.addEventListener('frame', () => {
    const { frame: at, segment } = icon.player!;
    frame.textContent = `frame ${Math.round(at)} of [${segment.join(', ')})`;
});
