import '../src/release';

document.querySelectorAll("lord-icon").forEach((element) => {
    element.addEventListener("ready", () => {
        element.classList.add("ready");
    });
});
