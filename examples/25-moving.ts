const icon = document.querySelector('#moving')!;
const cards = [document.querySelector('#first')!, document.querySelector('#second')!];

// Out of one card and into the other in the same task: the icon goes on as it was.
document.querySelector('#move')!.addEventListener('click', () => {
    const next = cards.find((card) => !card.contains(icon))!;
    next.prepend(icon);
});
