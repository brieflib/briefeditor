import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {handleEvent} from "@/core/keyboard/keyboard";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Keyboard events", () => {
    test("Press enter when cursor is at start of paragraph after paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><br></p><p class="start">first</p>
        `);
    });

    test("Press enter when cursor is at the end of paragraph before paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p><br></p><p>first</p>
        `);
    });

    test("Press enter when cursor spans selection", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirstsecond</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zerofirst".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p>second</p>
        `);
    });

    test("Press enter when cursor spans selection of strong", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong>second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p>second</p>
        `);
    });

    test("Press enter when cursor spans selection of part of strong", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong>second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        handleEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><strong class="start">st</strong>second</p>
        `);
    });

    test("Press delete when selection spans two paragraphs", () => {
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

        expect((wrapper.querySelector(".start") as HTMLElement).childNodes.length).toBe(1);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe(2);
        expect(cursorPosition.endOffset).toBe(2);
    });
});