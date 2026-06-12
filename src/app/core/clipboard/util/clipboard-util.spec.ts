import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {sanitizeHtml} from "@/core/clipboard/util/clipboard-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Sanitize input", () => {
    test("Should insert p", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "f".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "f".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        sanitizeHtml(wrapper, `<p><strong style="margin: 0">second<span class="test">third</span></strong></p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>f<strong>second<span>third</span></strong>irst</p>
        `);
    });

    test("Should insert html outside from formating elements", () => {
        const wrapper = createWrapper(`
            <p><em class="start">first</em></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "f".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "f".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        sanitizeHtml(wrapper, `<strong style="margin: 0">second</strong>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p><em>f</em><strong>second</strong><em>irst</em></p>
        `);
    });
});