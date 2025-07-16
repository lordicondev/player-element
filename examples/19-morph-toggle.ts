import { defineElement } from "../src";

defineElement();

const listElement = document.getElementById("list")!;
const items = Array.from(listElement.querySelectorAll("div"));

items.forEach((item) => {
    item.addEventListener("click", () => {
        items.filter(c => c !== item).forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
    });
});