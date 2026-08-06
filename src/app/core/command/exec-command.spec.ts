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
            <p>
                <strong>zero</strong>
            </p>
            <p>first</p>
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
                <li><strong>zero</strong>first</li>
                <li>
                    <strong>second</strong>
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
                        <li>second</li>
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

        // After: <p class="start"><strong>ze</strong>ro</p>
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

        // After: <p class="start">ze<strong>ro</strong></p>
        const expectedNode = wrapper.querySelector("p")?.firstChild;
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

        expectHtml(wrapper.innerHTML, `
            <p><strong>zero</strong></p>
            <p><strong>fir</strong>st</p>
        `)

        // After: <p class="start"><strong>zero</strong></p><p class="end"><strong>fir</strong>st</p>
        const expectedStart = wrapper.querySelectorAll("strong")[0]?.firstChild;
        const expectedEnd = wrapper.querySelectorAll("strong")[1]?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("fir".length);
    });

    test("Cursor should span middle of wrapped content", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "z".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        // After: <p class="start">z<strong>er</strong>o</p>
        const expectedStart = wrapper.querySelector("strong")?.firstChild;
        const expectedEnd = wrapper.querySelector("strong")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("er".length);
    });

    test("Wrap different type of content. Cursor position should span both", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "z".length);
        range.setEnd(getFirstChild(wrapper, ".start strong"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, `
             <p>z<strong>erofirst</strong>second</p>
        `);

        const expectedStart = wrapper.querySelector("p")?.firstChild;
        const expectedEnd = wrapper.querySelector("p strong")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("z".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("erofir".length);
    });

    test("Should return cursor spanning unwrapped content across two list items", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><strong>zero</strong></li>
                <li><strong>first</strong></li>
                <li class="end"><strong>second</strong></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start strong"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end strong"), "sec".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li>first</li>
                <li>sec<strong>ond</strong></li>
            </ul>
        `)

        const expectedStart = wrapper.querySelectorAll("li")[0]?.firstChild;
        const expectedEnd = wrapper.querySelectorAll("li")[2]?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("sec".length);
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

        // After: <ul><li>zero<ul><li>first</li></ul></li></ul>
        const expectedNode = wrapper.querySelectorAll("li")[1]?.firstChild;
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
        const expectedStart = wrapper.querySelectorAll("ul li")[1]?.firstChild;
        const expectedEnd = wrapper.querySelectorAll("ul li")[2]?.firstChild;
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
        const expectedStart = wrapper.querySelectorAll("ul li ul li")[0]?.firstChild;
        const expectedEnd = wrapper.querySelectorAll("ul li ul li strong")[0]?.firstChild;
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
        const expectedNode = wrapper.querySelectorAll("ul li")[2]?.firstChild;
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
        const expectedStart = wrapper.querySelectorAll("ul li")[2]?.firstChild;
        const expectedEnd = wrapper.querySelectorAll("ul li")[3]?.firstChild;
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
        const expectedNode = wrapper.querySelectorAll("ol li")[1]?.lastChild;
        expect(cursorPosition.startContainer).toBe(expectedNode);
        expect(cursorPosition.startOffset).toBe("r".length);
        expect(cursorPosition.endContainer).toBe(expectedNode);
        expect(cursorPosition.endOffset).toBe("rst".length);
    });
});

describe("Delete row command", () => {
    function select(wrapper: HTMLElement, selector: string) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, selector), "".length);
        range.setEnd(getFirstChild(wrapper, selector), "".length);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    function selectCell(wrapper: HTMLElement, selector: string) {
        select(wrapper, selector);

        return wrapper.querySelector(selector) as HTMLTableCellElement;
    }

    test("Should keep a section that still holds rows", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="head">zero</th></tr></thead>
            <tbody><tr><td class="first">first</td></tr><tr><td>second</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".first");

        execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th class="head">zero</th></tr></thead>
            <tbody><tr><td>second</td></tr></tbody></table>
        `);
    });

    test("Should remove a section left empty by the deleted row", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="head">zero</th></tr></thead>
            <tbody><tr><td class="first">first</td></tr><tr><td>second</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".head");

        execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectHtml(wrapper.innerHTML, `
            <table>
            <tbody><tr><td class="first">first</td></tr><tr><td>second</td></tr></tbody></table>
        `);
    });

    test("Should remove the table left without rows", () => {
        const wrapper = createWrapper(`
            <p class="text">text</p>
            <table><thead><tr><th class="head">zero</th></tr></thead></table>
        `);
        const cell = wrapper.querySelector(".head") as HTMLTableCellElement;
        select(wrapper, ".text");

        execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectHtml(wrapper.innerHTML, `<p class="text">text</p>`);
    });

    test("Should remove the table left without columns", () => {
        const wrapper = createWrapper(`
            <p class="text">text</p>
            <table><thead><tr><th class="head">zero</th></tr></thead>
            <tbody><tr><td>first</td></tr></tbody></table>
        `);
        const cell = wrapper.querySelector(".head") as HTMLTableCellElement;
        select(wrapper, ".text");

        execCommand(wrapper, {action: Action.DeleteColumn, table: {cell}});

        expectHtml(wrapper.innerHTML, `<p class="text">text</p>`);
    });
});

// The controls that drive these commands sit outside the editor, so the cursor they leave behind belongs
// to no cell of the edited table. Each command names the cell to carry it to instead.
describe("Cursor position after a table command", () => {
    // A cell the command has just built holds a br and no text of its own, and the br is where an empty
    // block takes its cursor.
    function getEmptyCell(wrapper: HTMLElement, index: number) {
        return wrapper.querySelectorAll("th, td")[index]?.firstChild;
    }

    function selectCell(wrapper: HTMLElement, selector: string) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, selector), "".length);
        range.setEnd(getFirstChild(wrapper, selector), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        return wrapper.querySelector(selector) as HTMLTableCellElement;
    }

    function expectCursorAt(cursorPosition: CursorPosition, node: Node | null | undefined, offset: number) {
        expect(cursorPosition.startContainer).toBe(node);
        expect(cursorPosition.startOffset).toBe(offset);
        expect(cursorPosition.endContainer).toBe(node);
        expect(cursorPosition.endOffset).toBe(offset);
    }

    test("Should move the cursor into the inserted row", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="first">zero</td><td class="second">first</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".second");

        const cursorPosition = execCommand(wrapper, {action: Action.InsertRow, table: {cell, after: true}});

        // After: <tr><td>zero</td><td>first</td></tr><tr><td><br></td><td><br></td></tr>
        expectCursorAt(cursorPosition, getEmptyCell(wrapper, 3), 0);
    });

    test("Should move the cursor into the row inserted below the header", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="head">zero</th><th class="second">first</th></tr></thead>
            <tbody><tr><td>second</td><td>third</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".second");

        const cursorPosition = execCommand(wrapper, {action: Action.InsertRow, table: {cell, after: true}});

        // The new row opens the body, so its cells come right after the header ones.
        expectCursorAt(cursorPosition, getEmptyCell(wrapper, 3), 0);
    });

    test("Should move the cursor into the inserted column of the hovered row", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="head">zero</th></tr></thead>
            <tbody><tr><td class="first">first</td></tr><tr><td>second</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".first");

        const cursorPosition = execCommand(wrapper, {action: Action.InsertColumn, table: {cell, after: true}});

        // Every row gains a cell, and the cursor takes the one of the row the column was inserted from.
        expectCursorAt(cursorPosition, getEmptyCell(wrapper, 3), 0);
    });

    test("Should move the cursor to the row that took the deleted one's place", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="first">zero</td><td>one</td></tr>
            <tr><td class="second">two</td><td>three</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".first");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, ".second"), 0);
    });

    test("Should move the cursor to the new last row when the last one is deleted", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="first">zero</td><td>one</td></tr>
            <tr><td class="second">two</td><td>three</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".second");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, ".first"), 0);
    });

    test("Should move the cursor to the column that took the deleted one's place", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="first">zero</td><td class="second">one</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".first");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteColumn, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, ".second"), 0);
    });

    test("Should move the cursor to the new last column when the last one is deleted", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="first">zero</td><td class="second">one</td></tr></tbody></table>
        `);
        const cell = selectCell(wrapper, ".second");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteColumn, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, ".first"), 0);
    });

    test("Should move the cursor to the block before a table the last delete removed", () => {
        const wrapper = createWrapper(`
            <p class="text">text</p>
            <table><thead><tr><th class="head">zero</th></tr></thead></table>
            <p>after</p>
        `);
        const cell = selectCell(wrapper, ".head");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, ".text"), "text".length);
    });

    test("Should move the cursor to the block after a table that opened the editor", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="head">zero</th></tr></thead></table>
            <p class="text">text</p>
        `);
        const cell = selectCell(wrapper, ".head");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteColumn, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, ".text"), 0);
    });
});
// A table is not a first level element and cannot hold one, so it is never inserted at the cursor itself:
// it goes before, after, or between the halves of the first level element the cursor is in.
describe("Insert table command", () => {
    function selectAt(wrapper: HTMLElement, selector: string, offset: number) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, selector), offset);
        range.setEnd(getFirstChild(wrapper, selector), offset);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    test("Should build a header row and a body of the picked size", () => {
        const wrapper = createWrapper(`<p class="start">first</p>`);
        selectAt(wrapper, ".start", "first".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 3, columns: 2}});

        expectHtml(wrapper.innerHTML, `
            <p class="start">first</p>
            <table><thead><tr><th><br></th><th><br></th></tr></thead>
            <tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table>
        `);
    });

    test("Should build a table of a single header cell", () => {
        const wrapper = createWrapper(`<p class="start">first</p>`);
        selectAt(wrapper, ".start", "first".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <p class="start">first</p>
            <table><thead><tr><th><br></th></tr></thead></table>
        `);
    });

    test("Should split the paragraph the cursor is in the middle of", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <p class="start">first</p>
        `);
        selectAt(wrapper, ".start", "fi".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p class="start">fi</p>
            <table><thead><tr><th><br></th></tr></thead></table>
            <p>rst</p>
        `);
    });

    test("Should keep the paragraph whole when the cursor is at its end", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p>
            <p>second</p>
        `);
        selectAt(wrapper, ".start", "first".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <p class="start">first</p>
            <table><thead><tr><th><br></th></tr></thead></table>
            <p>second</p>
        `);
    });

    test("Should keep the paragraph whole when the cursor is at its start", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <p class="start">first</p>
        `);
        selectAt(wrapper, ".start", "".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <table><thead><tr><th><br></th></tr></thead></table>
            <p class="start">first</p>
        `);
    });

    test("Should insert into an empty block without splitting it", () => {
        const wrapper = createWrapper(`<p class="start"><br></p>`);
        selectAt(wrapper, ".start", 0);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th><br></th></tr></thead></table>
            <p class="start"><br></p>
        `);
    });

    test("Should split the list the cursor is in the middle of", () => {
        const wrapper = createWrapper(`
            <ul><li>zero</li><li class="start">first</li><li>second</li></ul>
        `);
        selectAt(wrapper, ".start", "fi".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li><li>fi</li></ul>
            <table><thead><tr><th><br></th></tr></thead></table>
            <ul><li>rst</li><li>second</li></ul>
        `);
    });

    test("Should split the list before the item the cursor opens", () => {
        const wrapper = createWrapper(`
            <ul><li>zero</li><li class="start">first</li><li>second</li></ul>
        `);
        selectAt(wrapper, ".start", "".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li></ul>
            <table><thead><tr><th><br></th></tr></thead></table>
            <ul><li>first</li><li>second</li></ul>
        `);
    });

    test("Should split the list after the item the cursor closes", () => {
        const wrapper = createWrapper(`
            <ul><li>zero</li><li class="start">first</li><li>second</li></ul>
        `);
        selectAt(wrapper, ".start", "first".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li><li>first</li></ul>
            <table><thead><tr><th><br></th></tr></thead></table>
            <ul><li>second</li></ul>
        `);
    });

    test("Should lift a nested item that opens the split side to a list of its own", () => {
        const wrapper = createWrapper(`
            <ul><li>zero<ul><li class="start">nested</li></ul></li><li>second</li></ul>
        `);
        selectAt(wrapper, ".start", "".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li></ul>
            <table><thead><tr><th><br></th></tr></thead></table>
            <ul><li>nested</li><li>second</li></ul>
        `);
    });

    test("Should keep the nesting of a side that holds a whole nested list", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero<ul><li>nested</li></ul></li><li>second</li></ul>
        `);
        selectAt(wrapper, ".start", "".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th><br></th></tr></thead></table>
            <ul><li>zero<ul><li>nested</li></ul></li><li>second</li></ul>
        `);
    });

    test("Should drop the insert when the cursor is inside a cell", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="start">zero</th></tr></thead>
            <tbody><tr><td>first</td></tr></tbody></table>
        `);
        selectAt(wrapper, ".start", "ze".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 2, columns: 2}});

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th class="start">zero</th></tr></thead>
            <tbody><tr><td>first</td></tr></tbody></table>
        `);
    });

    test("Should move the cursor into the first header cell", () => {
        const wrapper = createWrapper(`<p class="start">first</p>`);
        selectAt(wrapper, ".start", "fi".length);

        const cursorPosition = execCommand(wrapper, {action: Action.InsertTable, size: {rows: 2, columns: 2}});

        const firstCell = wrapper.querySelector("th")?.firstChild;
        expect(cursorPosition.startContainer).toBe(firstCell);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endContainer).toBe(firstCell);
        expect(cursorPosition.endOffset).toBe(0);
    });
});
