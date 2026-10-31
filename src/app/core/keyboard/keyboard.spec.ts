import {
    createWrapper,
    expectCursor,
    expectHtml,
    getFirstChild,
    getLastChild,
    keydown,
    querySelector,
    selectRange
} from "@/core/shared/test-util";
import {handleKeyboardEvent} from "@/core/keyboard/keyboard";
import {getCursorAnchor, resolveCursorAnchor} from "@/core/cursor/util/cursor-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import {Action} from "@/core/command/type/command";
import {AvailableClasses} from "@/core/shared/available-classes";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

beforeAll(() => {
    const availableClasses = AvailableClasses.getInstance();
    availableClasses.setClasses(["start", "end"]);
});

describe("Keyboard events", () => {
    test("Press enter when cursor is at start of paragraph after paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start">first</p>
        `);

        let first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p class="start"><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        first = getFirstChild(wrapper, "p:nth-child(3)");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press enter when cursor is at the end of paragraph before paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p>first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "p:nth-child(2)");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Pressing enter when cursor is at the end of paragraph before the next paragraph. Cursor position should be between paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p>first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "p:nth-child(2)");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Pressing enter when cursor is at the start of paragraph after the next paragraph. Cursor position should be between paragraphs", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <p class="start">first</p>
        `);

        let first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p class="start"><br></p>
            <p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        first = getFirstChild(wrapper, ":nth-child(3)");
        expectCursor(cursorPosition, first, "".length);
    });

    test("After pressing enter when cursor is at the br cursor position should be at next br", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start"><br></p><p>first</p>
        `);

        let br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p class="start"><br></p><p><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        br = getFirstChild(wrapper, "p:nth-child(3)");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press enter when cursor spans selection", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirstsecond</p>
        `);

        const zeroFirstSecond = getFirstChild(wrapper, ".start");
        selectRange(zeroFirstSecond, "zero".length, zeroFirstSecond, "zerofirst".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const second = getFirstChild(wrapper, "p:nth-child(2)");
        expectCursor(cursorPosition, second, "".length);
    });

    test("Press enter when cursor spans selection of strong", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong>second</p>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const second = getFirstChild(wrapper, "p + p");
        expectCursor(cursorPosition, second, "".length);
    });

    test("Press enter when cursor spans selection of part of strong", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong>second</p>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "fir".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><strong class="start">st</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const st = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, st, "".length);
    });

    test("Press enter when cursor is at the beginning of tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p><strong>first</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "strong");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press shift+enter when cursor is at the beginning of tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const shiftEnter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", shiftKey: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), shiftEnter);

        handleKeyboardEvent(wrapper, shiftEnter);
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero<br><strong>first</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "strong");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press shift+enter when cursor is in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirst</p>
        `);

        const zeroFirst = getFirstChild(wrapper, ".start");
        selectRange(zeroFirst, "zero".length, zeroFirst, "zero".length);
        const shiftEnter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", shiftKey: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), shiftEnter);

        handleKeyboardEvent(wrapper, shiftEnter);
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero<br>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press shift+enter when cursor is at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start">first</p>
        `);

        let first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "first".length);
        const shiftEnter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", shiftKey: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), shiftEnter);

        handleKeyboardEvent(wrapper, shiftEnter);
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p class="start"><br></p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        first = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press delete when selection spans two paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p class="end">first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "ze".length, first, "fir".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zest</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zest = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zest, "ze".length);
    });

    // Items selected whole are emptied into one item rather than dropped, the way a browser leaves an empty
    // line for a selection of whole blocks; the next thing typed or pasted fills it.
    test("Press delete when selection covers a whole list followed by a paragraph", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero</li><li>first</li><li class="end">second</li></ul><p>third</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const second = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, second, "second".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ul><li><br></li></ul><p>third</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press delete when selection covers a whole list after a paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero</p><ul><li class="start">first</li><li>second</li><li class="end">third</li></ul>
        `);

        const first = getFirstChild(wrapper, ".start");
        const third = getFirstChild(wrapper, ".end");
        selectRange(first, "".length, third, "third".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><ul><li><br></li></ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press delete when selection covers two whole items of three", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero</li><li class="end">first</li><li>second</li></ul>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ul><li><br></li><li>second</li></ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, br, 0);
    });

    test("Press delete when selection covers two whole paragraphs of three", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p class="end">first</p><p>second</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p class="start"><br></p><p>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, "".length);
    });

    test("After pressing delete when cursor is at the br cursor position should be at previous br", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p><br></p><p><br></p><p class="start"><br></p><p>first</p>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><br></p><p><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "p:nth-child(4)");
        expectCursor(cursorPosition, first, "".length);
    });
});

describe("Typing and deleting characters", () => {
    test("Type a character in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zexro</p>
        `);
        expect(querySelector(wrapper, "p").childNodes.length).toBe(1);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zexro = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zexro, "zex".length);
    });

    test("Type a character in an empty paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start"><br></p>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">x</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Type a character on the br before a line break keeps the break", () => {
        const wrapper = createWrapper(`
            <p class="start"><br>zero</p>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">x<br>zero</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Type a character in the empty line after a line break with the caret on the paragraph", () => {
        const wrapper = createWrapper(`
              <p class="start">zero<br><br></p>
          `);

        const paragraph = querySelector(wrapper, ".start");
        selectRange(paragraph, 2, paragraph, 2);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
              <p class="start">zero<br>x</p>
          `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Type a character between two line breaks with the caret on the paragraph", () => {
        const wrapper = createWrapper(`
              <p class="start"><br><br>zero</p>
          `);

        const paragraph = querySelector(wrapper, ".start");
        selectRange(paragraph, 1, paragraph, 1);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
              <p class="start"><br>x<br>zero</p>
          `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = querySelector(wrapper, ".start").childNodes[1];
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Type a character at the start of the line after a line break with the caret on the paragraph", () => {
        const wrapper = createWrapper(`
              <p class="start"><br>zero</p>
          `);

        const paragraph = querySelector(wrapper, ".start");
        selectRange(paragraph, 1, paragraph, 1);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
              <p class="start"><br>xzero</p>
          `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const xzero = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, xzero, "x".length);
    });

    test("Type a character in an empty list item with the caret on the item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br></li>
                <li>zero</li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>x</li>
                <li>zero</li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Type a character in an empty list item holding a nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br>
                    <ul>
                        <li>zero</li>
                    </ul>
                </li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>x
                    <ul>
                        <li>zero</li>
                    </ul>
                </li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Type a character in an empty list item keeps the placeholder of an empty nested item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br>
                    <ul>
                        <li><br></li>
                    </ul>
                </li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>x
                    <ul>
                        <li><br></li>
                    </ul>
                </li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Press backspace in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zro</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zro = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zro, "z".length);
    });

    test("Press delete in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zeo</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zeo = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zeo, "ze".length);
    });

    test("Press backspace at the start of text after an inline tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const second = getLastChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero<strong>firs</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const firs = getFirstChild(wrapper, "strong");
        expectCursor(cursorPosition, firs, "firs".length);
    });

    test("Press backspace on the last character of an inline tag", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">f</strong>second</p>
        `);

        const f = getFirstChild(wrapper, ".start");
        selectRange(f, "f".length, f, "f".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p>zerosecond</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zeroSecond = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, zeroSecond, "zero".length);
    });

    test("Press backspace on the last character of the only paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">z</p>
        `);

        const z = getFirstChild(wrapper, ".start");
        selectRange(z, "z".length, z, "z".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p class="start"><br></p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press backspace after a line break", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<br>first</p>
        `);

        const first = getLastChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zerofirst</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zeroFirst = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zeroFirst, "zero".length);
    });

    test("Press delete before a line break", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<br>first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zerofirst</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zeroFirst = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zeroFirst, "zero".length);
    });

    test("Should merge lists when pressing delete before br", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li>first</li>
                <li class="start"><br>
                    <ol><li>second</li></ol>
                </li>
            </ol>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const second = getFirstChild(wrapper, "ol li:last-child ol li");
        expectCursor(cursorPosition, second, "".length);
    });

    test("Should merge lists of different types when pressing delete before br", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br>
                    <ol>
                        <li>zero</li>
                    </ol>
                </li>
            </ul>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "ol li");
        expectCursor(cursorPosition, zero, "".length);
    });

    test("Should merge lists of different types when pressing delete before br with li before", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start"><br>
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ol>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "ol li ul li");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Should merge lists when pressing backspace after br", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li><br></li>
                    </ol>
                </li>
                <li class="start">second</li>
            </ol>
        `);

        const second = getFirstChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const mergedSecond = getFirstChild(wrapper, "ol li ol li:last-child");
        expectCursor(cursorPosition, mergedSecond, "".length);
    });

    test("Should merge lists of different types when pressing backspace after br", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li><br></li>
                    </ol>
                </li>
            </ol>
            <ul>
                <li class="start">second</li>
            </ul>
        `);

        const second = getFirstChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const mergedSecond = getFirstChild(wrapper, "ol li ul li:last-child");
        expectCursor(cursorPosition, mergedSecond, "".length);
    });

    test("Should merge lists of the same types when pressing delete before nested br", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start"><br>
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ol>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
                <li>first</li>
                <li>second</li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "li + li");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Should merge lists of the same types when pressing backspace after nested br", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li><br>
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
                <li>second</li>
            </ol>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol><li>first</li></ol>
                </li>
                <li>second</li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const nestedFirst = getFirstChild(wrapper, "ol ol li");
        expectCursor(cursorPosition, nestedFirst, "".length);
    });

    test("Should merge lists of the same types when pressing delete before nested br 2", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li class="start"><br></li>
                    </ol>
                </li>
                <li>first</li>
            </ol>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "ol ol li");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Delete over the text of an item holding a nested list leaves the placeholder above the list", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start">first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
                <li class="start"><br>
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Backspace over the text of an item holding a nested list leaves the placeholder above the list", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start">first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
                <li class="start"><br>
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, "".length);
    });

    // The browser anchors the cursor on an empty item itself, so the item is what the cursor is set on.
    test("Backspace in an empty nested item drops it and lands at the end of the line above", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start"><br></li>
                    </ul>
                </li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace on the br of an empty nested item drops the item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start"><br></li>
                    </ul>
                </li>
            </ul>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace in an empty nested item lowers the items nested inside it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start"><br>
                            <ul>
                                <li>first</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace in an empty nested item keeps the item written below it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start"><br></li>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace in an empty first level item drops it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace in an empty first level item holding a nested list drops it", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start"><br>
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    // Arriving at the end of the empty line, the browser anchors the cursor on the item after the br, which
    // is just before the list nested inside it. The item is the one on that line, not the nested one.
    test("Backspace after the br of an empty first level item holding a nested list drops it", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start"><br>
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, 1, li, 1);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace in the only empty item below a paragraph drops the list", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <ul>
                <li class="start"><br></li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Backspace in the only empty item opening the document drops the list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br></li>
            </ul>
            <p>zero</p>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, zero, "".length);
    });

    // The paragraph the editor is left with is written by the command once the keyboard is done.
    test("Backspace in the only empty item of the document empties the editor", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br></li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, ``);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, wrapper, "".length);
    });

    test("Press backspace when selection is inside one paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirst</p>
        `);

        const zeroFirst = getFirstChild(wrapper, ".start");
        selectRange(zeroFirst, "ze".length, zeroFirst, "zerofi".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zerst</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zerst = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zerst, "ze".length);
    });

    test("Type a character over a selection inside one paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirst</p>
        `);

        const zeroFirst = getFirstChild(wrapper, ".start");
        selectRange(zeroFirst, "ze".length, zeroFirst, "zerofi".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zexrst</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zexrst = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zexrst, "zex".length);
    });

    test("Type a character over a fully selected inline tag", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong></p>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

        handleKeyboardEvent(wrapper, keydown("x"));
        expectHtml(wrapper.innerHTML, `
            <p>zero<strong class="start">x</strong></p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const x = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, x, "x".length);
    });

    test("Press backspace after an emoji", () => {
        const wrapper = createWrapper(`
            <p class="start">zero👍</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero👍".length, zero, "zero👍".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zeroWithoutEmoji = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zeroWithoutEmoji, "zero".length);
    });

    test("After removing content and pressing delete next tag should merge", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
            <p>first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "".length, zero, "zero".length);
        let cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `
            <h1 class="start"><br></h1><p>first</p>
        `);

        let cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, "".length);

        selectRange(br, "".length, br, "".length);
        cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p>first</p>
        `);

        cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, first, "".length);
    });

    // A cell is no block, so enter has nothing to split and is dropped rather than left to the browser.
    test("Enter inside a cell keeps a table of empty cells", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="start"></th><th></th></tr></thead>
            <tbody><tr><td></td><td></td></tr></tbody></table>
        `);

        const th = querySelector(wrapper, ".start");
        selectRange(th, "".length, th, "".length);
        const enter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", cancelable: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), enter);

        handleKeyboardEvent(wrapper, enter);
        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th class="start"></th><th></th></tr></thead>
            <tbody><tr><td></td><td></td></tr></tbody></table>
        `);
        expect(th.isConnected).toBe(true);
        expect(enter.event.defaultPrevented).toBe(true);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, th, "".length);
    });

    test("Enter in the middle of a cell leaves its text whole", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, zero, "ze".length);
    });

    // A break would grow the row instead of ending a line, so shift does not make an exception.
    test("Shift and enter in the middle of a cell inserts no break", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const shiftEnter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", shiftKey: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), shiftEnter);

        handleKeyboardEvent(wrapper, shiftEnter);
        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, zero, "ze".length);
    });

    // A selection reaching out of the table would take the split with it, so the cell it starts in is
    // enough to drop the enter.
    test("Enter over a selection running out of a cell keeps both blocks", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td></tr></tbody></table><p class="end">first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "ze".length, first, "fi".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">zero</td></tr></tbody></table><p class="end">first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, zero, "ze".length, first, "fi".length);
    });

    // The editor is a block of a page it knows nothing about, and that page may well be laid out in a
    // table. Only the tables the editor holds itself count, so the search for one stops at the editor.
    test("Enter splits a paragraph of an editor embedded in a table of the page", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);
        const td = document.createElement("td");
        wrapper.replaceWith(td);
        td.appendChild(wrapper);
        const tr = document.createElement("tr");
        tr.appendChild(td);
        const table = document.createElement("table");
        table.appendChild(tr);
        document.body.appendChild(table);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>ze</p><p>ro</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const ro = getFirstChild(wrapper, "p + p");
        expectCursor(cursorPosition, ro, "".length);
    });

    test("Arrow keys do not change the dom and are not prevented", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "ze".length);
        const arrowLeft = keydown("ArrowLeft");
        const preventDefault = jest.spyOn(arrowLeft.event, "preventDefault");
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), arrowLeft);

        handleKeyboardEvent(wrapper, arrowLeft);
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
        `);
        expect(preventDefault).not.toHaveBeenCalled();

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, zero, "ze".length);
    });

    test.each(["Home", "End", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "F1", "Tab", "Escape"])(
        "%s over a selection across blocks does not change the dom and is not prevented", (key) => {
            const wrapper = createWrapper(`
                <p class="start">zero</p><p class="end">first</p>
            `);

            const zero = getFirstChild(wrapper, ".start");
            const first = getFirstChild(wrapper, ".end");
            selectRange(zero, "ze".length, first, "fi".length);
            const pressedKey = keydown(key);
            const preventDefault = jest.spyOn(pressedKey.event, "preventDefault");
            const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), pressedKey);

            handleKeyboardEvent(wrapper, pressedKey);
            expectHtml(wrapper.innerHTML, `
                <p class="start">zero</p><p class="end">first</p>
            `);
            expect(preventDefault).not.toHaveBeenCalled();

            const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
            expectCursor(cursorPosition, zero, "ze".length, first, "fi".length);
        });
});

// A browser leaves the caret in an empty item on the item itself rather than on its br; both must read
// the same, so every case here runs with the caret in either place.
describe("Editing over a selection ending on an empty nested item", () => {
    const html = `
        <h3 class="start">zero</h3>
        <ol>
            <li>first
                <ol>
                    <li class="empty"><br></li>
                </ol>
            </li>
        </ol>
    `;

    for (const caretOnItem of [false, true]) {
        const caret = caretOnItem ? "caret on the item" : "caret on the br";

        test(`Should type over the selection without leaving a break behind (${caret})`, () => {
            const wrapper = createWrapper(html);

            const zero = getFirstChild(wrapper, ".start");
            const empty = caretOnItem ? querySelector(wrapper, ".empty") : querySelector(wrapper, "br");
            selectRange(zero, "".length, empty, "".length);
            const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

            handleKeyboardEvent(wrapper, keydown("x"));
            expectHtml(wrapper.innerHTML, `<h3>x</h3>`);

            const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
            const x = getFirstChild(wrapper, "h3");
            expectCursor(cursorPosition, x, "x".length);
            // The cursor must be one the selection can be set to, or the edit is never committed.
            expect(() => new Range().setStart(cursorPosition.startContainer, cursorPosition.startOffset)).not.toThrow();
        });

        test(`Should keep the heading's words when typing over a selection starting inside it (${caret})`, () => {
            const wrapper = createWrapper(html);

            const zero = getFirstChild(wrapper, ".start");
            const empty = caretOnItem ? querySelector(wrapper, ".empty") : querySelector(wrapper, "br");
            selectRange(zero, "ze".length, empty, "".length);
            const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("x"));

            handleKeyboardEvent(wrapper, keydown("x"));
            expectHtml(wrapper.innerHTML, `<h3>zex</h3>`);

            const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
            const zex = getFirstChild(wrapper, "h3");
            expectCursor(cursorPosition, zex, "zex".length);
        });

        test(`Should leave an empty heading after backspace over the selection (${caret})`, () => {
            const wrapper = createWrapper(html);

            const zero = getFirstChild(wrapper, ".start");
            const empty = caretOnItem ? querySelector(wrapper, ".empty") : querySelector(wrapper, "br");
            selectRange(zero, "".length, empty, "".length);
            const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

            handleKeyboardEvent(wrapper, keydown("Backspace"));
            expectHtml(wrapper.innerHTML, `<h3><br></h3>`);

            const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
            const br = getFirstChild(wrapper, "h3");
            expectCursor(cursorPosition, br, "".length);
        });
    }
});

describe("Enter in an empty list item", () => {
    test("Enter in an empty item at the first level leaves the list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
                <li>first</li>
            </ul>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p><br></p>
            <ul>
                <li>first</li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const pBr = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, pBr, "".length);
    });

    test("Enter in a nested empty item lifts it one level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start"><br></li>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li><br>
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, br, "".length);
    });

    test("Enter in an item holding an image only inserts an item, the image being content of its own", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><img src="image.png"></li>
            </ul>
        `);

        const li = querySelector(wrapper, ".start");
        selectRange(li, "".length, li, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li><img src="image.png"></li>
                <li><br></li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li + li");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Shift enter in an empty item keeps the item in the list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
            </ul>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const shiftEnter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", shiftKey: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), shiftEnter);

        handleKeyboardEvent(wrapper, shiftEnter);
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, br, "".length);
    });

    test("Enter over a selection emptying an item divides the item, the item not having been empty", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start"><br></li>
                <li><br></li>
            </ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li + li");
        expectCursor(cursorPosition, br, "".length);
    });
});

describe("Deleting next to an image block", () => {
    const imageBlock = `<p class="be-image"><img src="image.png"></p>`;

    test("Backspace at the start of the line after an image block removes the image", () => {
        const wrapper = createWrapper(`<p>zero</p>${imageBlock}<p class="start">first</p>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<p>zero</p><p>first</p>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const lastFirst = getLastChild(wrapper, "p:last-child");
        expectCursor(cursorPosition, lastFirst, "".length);
    });

    test("Delete at the end of the line before an image block removes the image", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>${imageBlock}<p>first</p>`);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `<p>zero</p><p>first</p>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const firstZero = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, firstZero, "zero".length);
    });

    test("Backspace at the start of an item after an image block removes the image and keeps the list", () => {
        const wrapper = createWrapper(`<p>zero</p>${imageBlock}<ul><li class="start">first</li><li>second</li></ul>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<p>zero</p><ul><li>first</li><li>second</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const itemFirst = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, itemFirst, "".length);
    });

    test("Delete at the end of an empty line before an image block removes the image and keeps the line", () => {
        const wrapper = createWrapper(`<p class="start"><br></p>${imageBlock}<p>first</p>`);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `<p><br></p><p>first</p>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const firstBr = getFirstChild(wrapper, "p");
        expectCursor(cursorPosition, firstBr, "".length);
    });
});

// A list run ends at any line written between two wrappers, so removing that line leaves the
// wrappers standing side by side; the run has to be rebuilt as one for them to join.
describe("Removing the line two lists stand apart from one another by", () => {
    test("Delete in the empty line between two lists joins them", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start"><br></p><ul><li>first</li></ul>`);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Delete at the end of the list above the empty line joins them", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li></ul><p><br></p><ul><li>first</li></ul>`);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const joinedZero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, joinedZero, "zero".length);
    });

    test("Backspace at the start of the list below the empty line joins them", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p><br></p><ul><li class="start">first</li></ul>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const joinedFirst = getFirstChild(wrapper, "li + li");
        expectCursor(cursorPosition, joinedFirst, "".length);
    });

    test("Backspace at the start of a line written between two lists joins them", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start">first</p><ul><li>second</li></ul>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<ul><li>zerofirst</li><li>second</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zeroFirst = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zeroFirst, "zero".length);
    });

    test("Deleting a selection covering the line written between two lists joins them", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li></ul><p class="end">first</p><ul><li>second</li></ul>`);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "zero".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>second</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const joinedZero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, joinedZero, "zero".length);
    });

    test("Should leave lists of different types apart when the line between them goes", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start"><br></p><ol><li>first</li></ol>`);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li></ul><ol><li>first</li></ol>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zero = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Should leave the lists a line still stands between apart", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start">first</p><ul><li>second</li></ul>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "firs".length, first, "firs".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li></ul><p class="start">firs</p><ul><li>second</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const firs = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, firs, "firs".length);
    });

    test("Backspace at the start of an item after an image block between two lists joins them", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="be-image"><img src="image.png"></p><ul><li class="start">first</li></ul>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const joinedFirst = getFirstChild(wrapper, "li + li");
        expectCursor(cursorPosition, joinedFirst, "".length);
    });

    // The rebuild joins the run into the first wrapper, detaching the second; a cursor remapped by
    // its old position among the editor's children would land in the line after the run instead.
    test("Should keep the cursor in the joined list when a line follows the run", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p><br></p><ul><li class="start">first</li></ul><p>second</p>`);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        handleKeyboardEvent(wrapper, keydown("Backspace"));
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul><p>second</p>`);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const joinedFirst = getFirstChild(wrapper, "li + li");
        expectCursor(cursorPosition, joinedFirst, "".length);
    });
});
