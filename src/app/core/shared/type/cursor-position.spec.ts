import {createWrapper, expectHtml, getFirstChild, getText} from "@/core/shared/test-util";
import {
    extractContents,
    getCursorPositionFrom,
    getSelectedBlocksCursorPosition,
    insertNode
} from "@/core/shared/type/cursor-position";

describe("Selected blocks cursor position", () => {
    test("Should extract the selected blocks themselves", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start">first</p><p class="end">second</p><p>third</p>`);
        const first = wrapper.querySelector(".start");
        const cursorPosition = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "fi".length,
            getFirstChild(wrapper, ".end"), "se".length);

        const fragment = getSelectedBlocksCursorPosition(wrapper, cursorPosition)?.range.extractContents();

        expect(fragment?.firstChild).toBe(first);
        expectHtml(wrapper.innerHTML, `<p>zero</p><p>third</p>`);
    });
});

describe("Extract contents", () => {
    test("Should keep the selected blocks themselves and leave their remainders behind", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const first = wrapper.querySelector(".start") as HTMLElement;
        const last = wrapper.querySelector(".end") as HTMLElement;
        const cursorPosition = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "ze".length,
            getFirstChild(wrapper, ".end"), "fi".length);

        const fragment = extractContents(cursorPosition);

        expect(fragment.firstChild).toBe(first);
        expect(fragment.lastChild).toBe(last);
        expectHtml(wrapper.innerHTML, `<p class="start">ze</p><p class="end">rst</p>`);
    });

    test("Should keep a partly selected inline element", () => {
        const wrapper = createWrapper(`<p class="start"><strong>zero</strong>first</p>`);
        const strong = wrapper.querySelector(".start strong") as HTMLElement;
        const text = getText(wrapper, "zero");
        const first = getText(wrapper, "first");
        const cursorPosition = getCursorPositionFrom(text, "z".length, first, "fi".length);

        const fragment = extractContents(cursorPosition);

        expect(fragment.firstChild).toBe(strong);
        expect(fragment.lastChild).toBe(first);
        expectHtml(wrapper.innerHTML, `<p class="start"><strong>z</strong>rst</p>`);
    });

    test("Should keep a partly selected text node", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const text = getText(wrapper, "zero") as Text;
        const cursorPosition = getCursorPositionFrom(text, "z".length, text, "zer".length);

        const fragment = extractContents(cursorPosition);

        expect(fragment.firstChild).toBe(text);
        expect(text.data).toBe("er");
        expectHtml(wrapper.innerHTML, `<p class="start">zo</p>`);
    });

    test("Should leave the cursor range where the extracted content stood", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const text = getText(wrapper, "zero");
        const cursorPosition = getCursorPositionFrom(text, "z".length, text, "zer".length);

        const fragment = extractContents(cursorPosition);
        insertNode(cursorPosition, fragment);

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should ignore a text node the range only touches at its end", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const first = wrapper.querySelector(".end") as HTMLElement;
        const cursorPosition = getCursorPositionFrom(getText(wrapper, "zero"), "zero".length,
            getText(wrapper, "first"), "fi".length);

        const fragment = extractContents(cursorPosition);

        expect(fragment.firstChild).toBe(first);
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p><p class="end">rst</p>`);
    });

    test("Should leave the dom untouched for a collapsed range", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const text = getText(wrapper, "zero");
        const cursorPosition = getCursorPositionFrom(text, "z".length, text, "z".length);

        const fragment = extractContents(cursorPosition);

        expect(fragment.childNodes.length).toBe(0);
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });
});
