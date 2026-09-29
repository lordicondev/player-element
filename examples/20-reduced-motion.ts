import '../src/standalone.ts';

const query = matchMedia('(prefers-reduced-motion: reduce)');
const preference = document.querySelector<HTMLElement>('#preference')!;
const show = () => (preference.textContent = query.matches ? 'yes' : 'no');

show();
query.addEventListener('change', show);
