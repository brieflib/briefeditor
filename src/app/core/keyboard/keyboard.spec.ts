import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {handleEvent} from "@/core/keyboard/keyboard";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Keyboard events", () => {
    test("Press enter when cursor is at start of paragraph", () => {
        const wrapper = createWrapper(`
            <p>first</p><p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>first</p><p><br></p><p class="start">zero</p>
        `);
    });

    test("Press enter when cursor is at start of paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p><p class="end">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">firo</p>
        `);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        console.log(getFirstChild(wrapper, ".start").textContent);
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe(2);
        expect(cursorPosition.endOffset).toBe(2);
    });
});