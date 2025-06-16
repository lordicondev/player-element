import { Element } from '../src';
import '../src/release';

const playerElement = document.querySelector<Element>('lord-icon')!;

await playerElement.readyPromise;

const playerInstance = playerElement.playerInstance!;

updateDescription();

let direction: 1 | -1 = 1;

playerInstance.speed = 0.25;
playerInstance.stroke = 'light';
playerInstance.colors.primary = 'red';
playerInstance.colors.secondary = 'pink';

playerInstance.addEventListener('complete', () => {
    direction = direction === 1 ? -1 : 1;
    playerInstance.direction = direction;
});

playerInstance.addEventListener('frame', () => {
    updateDescription();
});

document.getElementById('play')?.addEventListener('click', (e) => {
    e.preventDefault();

    playerInstance.play();
});

document.getElementById('next-frames')?.addEventListener('click', (e) => {
    e.preventDefault();

    playerInstance.frame += 5;
});

document.getElementById('previous-frames')?.addEventListener('click', (e) => {
    e.preventDefault();

    playerInstance.frame -= 5;
});

document.getElementById('switch-state')?.addEventListener('click', (e) => {
    e.preventDefault();

    const states = playerInstance.availableStates.map((c) => c.name);

    let index = states.indexOf(playerInstance.state!);
    index++;

    if (index >= states.length) {
        index = 0;
    }

    playerInstance.direction = 1;
    playerInstance.state = states[index];
});

function updateDescription() {
    const frame = Math.round(playerInstance.frame);
    const totalFrames = playerInstance.frameCount;
    document.getElementById('description')!.innerText = `frame: ${frame} / ${totalFrames}`;
}
