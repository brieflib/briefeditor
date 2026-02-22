import {getRange} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {createWrapper, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {CursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Exec command with different cursor position", () => {
    test("Should apply bold when cursor located at start", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, `
            <p class="start">
                <strong>zero</strong>
            </p>
            <p class="end">first</p>
        `);
    });

    test("Should change paragraph to unordered list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.List, tag: "UL"});

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p class="end">first</p>
        `);
    });

    test("Should change paragraphs to unordered list with a text element", () => {
        const wrapper = createWrapper(`
            <p><strong class="start">zero</strong>first</p>
            <p>
                <strong class="end">second</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.List, tag: "UL"});

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li><strong class="start">zero</strong>first</li>
                <li>
                    <strong class="end">second</strong>
                </li>
            </ul>
        `);
    });

    test("Should change ordered list to unordered list when cursor is at start", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li class="start">second</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.List, tag: "UL"});

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                </li>
            </ul>
        `);
    });
});

describe("Link command", () => {
    test("Should set tag for link when cursor is inside link", () => {
        const wrapper = createWrapper(`
            <p>
                <a href="zero">zero <em class="start">first</em></a>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "f".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "f".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {
            action: Action.Link, tag: "A", attributes: {
                href: "first"
            }
        });

        expectHtml(wrapper.innerHTML, `
            <p>
                <a href="first">zero <em class="start">first</em></a>
            </p>
        `);
    });
});

describe("Cursor position after Tag command", () => {
    test("Should return cursor inside strong after wrapping full paragraph selection", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        // After: <p class="start"><strong>zero</strong></p>
        const expectedNode = wrapper.querySelector("strong")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("ze".length);
    });

    test("Should return cursor at unwrapped text after removing strong", () => {
        const wrapper = createWrapper(`
            <p class="start"><strong>zero</strong></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "strong"), "".length);
        range.setEnd(getFirstChild(wrapper, "strong"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        // After: <p class="start">zero</p>
        const expectedNode = wrapper.querySelector(".start")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("ze".length);
    });

    test("Should return cursor spanning wrapped content across two paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        // After: <p class="start"><strong>zero</strong></p><p class="end"><strong>first</strong></p>
        const expectedStart = wrapper.querySelector(".start strong")?.firstChild;
        const expectedEnd = wrapper.querySelector(".end strong")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("fir".length);
    });

    test("Should return cursor spanning unwrapped content across two list items", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><strong>zero</strong></li>
                <li class="end"><strong>first</strong></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start strong"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end strong"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        // After: <ul><li class="start">zero</li><li class="end">first</li></ul>
        const expectedStart = wrapper.querySelector(".start")?.firstChild;
        const expectedEnd = wrapper.querySelector(".end")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("fir".length);
    });
});

describe("Cursor position after FirstLevel command", () => {
    test("Should return cursor inside H1 after changing paragraph to heading", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        // After: <h1>zero</h1>
        const expectedNode = wrapper.querySelector("h1")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("ze".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    test("Should return cursor inside paragraph after toggling heading back to paragraph", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        // After: <p>zero</p>
        const expectedNode = wrapper.querySelector("p")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("ze".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    test("Should return cursor spanning both blocks after changing two paragraphs to headings", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        // After: <h1>zero</h1><h1>first</h1>
        const headings = wrapper.querySelectorAll("h1");
        const expectedStart = headings[0]?.firstChild;
        const expectedEnd = headings[1]?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("fir".length);
    });
});

describe("Cursor position after List command", () => {
    test("Should return cursor inside list item after converting paragraph to unordered list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.List, tag: "UL"});

        // After: <ul><li>zero</li></ul>
        const expectedNode = wrapper.querySelector("li")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("ze".length);
    });

    test("Should return cursor inside paragraph after converting unordered list back to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.List, tag: "UL"});

        // After: <p>zero</p>
        const expectedNode = wrapper.querySelector("p")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("".length);
    });

    test("Should return cursor spanning both list items after converting two paragraphs to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.List, tag: "UL"});

        // After: <ul><li>zero</li><li>first</li></ul>
        const listItems = wrapper.querySelectorAll("li");
        const expectedStart = listItems[0]?.firstChild;
        const expectedEnd = listItems[1]?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("".length);
    });

    test("Should return cursor inside list item after switching inner ordered list to unordered", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.List, tag: "UL"});

        // After: inner OL becomes UL
        const expectedNode = wrapper.querySelector("ul ul li")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("fir".length);
    });
});

describe("Cursor position after PlusIndent command", () => {
    test("Should keep cursor in the indented list item after single item indent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        // After: <ul><li>zero<ul><li class="start">first</li></ul></li></ul>
        const expectedNode = wrapper.querySelector(".start")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("fi".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("fi".length);
    });

    test("Should keep cursor spanning indented items after two items indent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        // After: <ul><li>zero<ul><li class="start">first</li><li class="end">second</li></ul></li></ul>
        const expectedStart = wrapper.querySelector(".start")?.firstChild;
        const expectedEnd = wrapper.querySelector(".end")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("fi".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("se".length);
    });

    test("Should keep cursor in li with nested child after indenting list with nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">fi
                    <strong class="end">rst</strong>
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "rst".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        // After: <ul><li>zero<ul><li class="start">fi<strong class="end">rst</strong></li><li>second</li></ul></li></ul>
        const expectedStart = wrapper.querySelector(".start")?.firstChild;
        const expectedEnd = wrapper.querySelector(".end")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("fi".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("rst".length);
    });
});

describe("Cursor position after MinusIndent command", () => {
    test("Should keep cursor in the outdented list item after single item outdent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.MinusIndent});

        // After: <ul><li>zero</li><li>first</li><li class="start">second</li></ul>
        const expectedNode = wrapper.querySelector(".start")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("se".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("se".length);
    });

    test("Should keep cursor spanning outdented items after two items outdent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second</li>
                        <li class="end">third</li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.MinusIndent});

        // After: <ul><li>zero</li><li>first</li><li class="start">second</li><li class="end">third<ul><li>fourth</li></ul></li></ul>
        const expectedStart = wrapper.querySelector(".start")?.firstChild;
        const expectedEnd = wrapper.querySelector(".end")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("se".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("th".length);
    });

    test("Should keep cursor inside list item with inline formatting after outdent", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li class="start">
                            <strong>fi</strong>
                            rst
                        </li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "r".length);
        range.setEnd(getLastChild(wrapper, ".start"), "rst".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.MinusIndent});

        // After: <ol><li>zero</li><li class="start"><strong>fi</strong>rst</li></ol>
        const expectedNode = wrapper.querySelector(".start")?.lastChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("r".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("rst".length);
    });
});