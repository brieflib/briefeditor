import {getElementsBetween, getFirstLevelElement} from "@/core/shared/element-util";

test("Should find first level element", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p><span>inner</span></p>";

    const block = getFirstLevelElement(container, container.firstChild?.firstChild as HTMLElement);

    expect(block).toBe(container.firstChild);
});

test("Should find elements between", () => {
    const toFind = document.createElement("div");
    toFind.innerHTML = "<em>ital</em><strong>bolditalic</strong><strong>bold</strong><u>underline</u>";
    document.body.appendChild(toFind);

    const start = toFind.childNodes[0] || toFind;
    const end = toFind.childNodes[2] || toFind;

    const elementsBetween = getElementsBetween(start as HTMLElement, end as HTMLElement);

    expect(elementsBetween).toStrictEqual([toFind.childNodes[0], toFind.childNodes[1], toFind.childNodes[2]]);
});