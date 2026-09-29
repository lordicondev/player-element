import '../src/standalone.ts';

const loaded = document.querySelector<HTMLElement>('#loaded')!;

for (const icon of document.querySelectorAll('lord-icon.fade')) {
    icon.addEventListener('ready', () => {
        icon.classList.add('ready');
        loaded.textContent = String(Number(loaded.textContent) + 1);
    });
}
