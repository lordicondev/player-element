import '../src/standalone.ts';

document.querySelector('#again')!.addEventListener('click', (event) => {
    event.preventDefault();
    location.reload();
});
