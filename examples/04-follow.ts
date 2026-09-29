import '../src/standalone.ts';

// A toggle button: a click flips aria-pressed, and the icon follows.
for (const button of document.querySelectorAll<HTMLButtonElement>('.toggle')) {
    button.addEventListener('click', () => {
        const pressed = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(pressed));
    });
}

// A selected item: a click selects the row, the icons follow aria-selected.
const rows = [...document.querySelectorAll<HTMLElement>('#list > div')];
for (const row of rows) {
    row.addEventListener('click', () => {
        for (const other of rows) other.setAttribute('aria-selected', String(other === row));
    });
}

// A count. There is no data-count at first: the first value tells follow it is a number.
const counter = document.querySelector<HTMLElement>('.counter')!;
const count = document.querySelector<HTMLElement>('#count')!;

function setCount(value: number): void {
    counter.dataset.count = String(value);
    count.textContent = String(value);
}

document.querySelector('#count-up')!.addEventListener('click', () => {
    setCount(Number(counter.dataset.count ?? 0) + 1);
});
document.querySelector('#count-reset')!.addEventListener('click', () => setCount(0));

// A stage of work: idle, busy for a while, done for a moment, idle again.
const stage = document.querySelector<HTMLElement>('.stage')!;
const stageLabel = document.querySelector<HTMLElement>('#stage')!;

function setStage(value: string): void {
    stage.dataset.stage = value;
    stageLabel.textContent = value;
}

document.querySelector('#stage-run')!.addEventListener('click', () => {
    if (stage.dataset.stage !== 'idle') return;
    setStage('busy');
    setTimeout(() => setStage('done'), 2500);
    setTimeout(() => setStage('idle'), 4500);
});
