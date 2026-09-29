import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getCursorPositionFrom, getSelectedBlocksCursorPosition} from "@/core/shared/type/cursor-position";

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
