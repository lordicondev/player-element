import '../src/standalone.ts';

const cards = document.querySelector<HTMLElement>('#cards')!;
const template = document.querySelector<HTMLTemplateElement>('#card')!;

document.querySelector('#add')!.addEventListener('click', () => {
    cards.append(template.content.cloneNode(true));
});
