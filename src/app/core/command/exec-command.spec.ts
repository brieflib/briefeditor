import {getRange} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {createWrapper, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {CursorPosition} from "@/core/shared/type/cursor-position";
import {Carrier} from "@/core/carrier/carrier";

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

        // The selection opens on the boundary between the paragraph's own text and the tag the wrap wrote,
        // which is one caret written two ways. It is anchored inside the tag, on the content the selection
        // covers, rather than at the end of the text written before it.
        const expectedStart = wrapper.querySelector("p strong")?.firstChild;
        const expectedEnd = wrapper.querySelector("p strong")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
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

    // An item holding nested lists is tagged on its own line; each nested item takes its own
    // turn, so no turn reaches the selection's end node before the last one does.
    const mixedList = `
        <ul>
            <li class="start">first
                <ol>
                    <li>second
                        <ul>
                            <li>third</li>
                        </ul>
                    </li>
                </ol>
                <ol>
                    <li class="end">fourth</li>
                </ol>
            </li>
        </ul>
    `;
    const mixedListWrapped = `
        <ul>
            <li><strong>first</strong>
                <ol>
                    <li><strong>second</strong>
                        <ul>
                            <li><strong>third</strong></li>
                        </ul>
                    </li>
                    <li><strong>fourth</strong></li>
                </ol>
            </li>
        </ul>
    `;

    test("Should keep the cursor spanning a whole nested list after wrapping it", () => {
        const wrapper = createWrapper(mixedList);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, mixedListWrapped);

        const strongs = wrapper.querySelectorAll("strong");
        expect(cursorPosition.startContainer).toBe(strongs[0]?.firstChild);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(strongs[3]?.firstChild);
        expect(cursorPosition.endOffset).toBe("fourth".length);
    });

    test("Should keep the cursor spanning a whole nested list after unwrapping it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><strong>first</strong>
                    <ol>
                        <li><strong>second</strong>
                            <ul>
                                <li><strong>third</strong></li>
                            </ul>
                        </li>
                        <li class="end"><strong>fourth</strong></li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start strong"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end strong"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li>third</li>
                            </ul>
                        </li>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `);

        const items = wrapper.querySelectorAll("li");
        expect(cursorPosition.startContainer).toBe(items[0]?.firstChild);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(items[3]?.firstChild);
        expect(cursorPosition.endOffset).toBe("fourth".length);
    });

    test("Should wrap a whole nested list selected on its elements", () => {
        const wrapper = createWrapper(mixedList);

        // A select-all leaves the ends on the list and the editor rather than on text.
        const range = new Range();
        range.setStart(wrapper.querySelector("ul") as Node, 0);
        range.setEnd(wrapper, wrapper.childNodes.length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, mixedListWrapped);

        const strongs = wrapper.querySelectorAll("strong");
        expect(cursorPosition.startContainer).toBe(strongs[0]?.firstChild);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(strongs[3]?.firstChild);
        expect(cursorPosition.endOffset).toBe("fourth".length);
    });

    test("Should keep the cursor spanning a selection reaching into nested items", () => {
        const wrapper = createWrapper(mixedList);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>fi<strong>rst</strong>
                    <ol>
                        <li><strong>second</strong>
                            <ul>
                                <li><strong>third</strong></li>
                            </ul>
                        </li>
                        <li><strong>fou</strong>rth</li>
                    </ol>
                </li>
            </ul>
        `);

        const strongs = wrapper.querySelectorAll("strong");
        expect(cursorPosition.startContainer).toBe(strongs[0]?.firstChild);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(strongs[3]?.firstChild);
        expect(cursorPosition.endOffset).toBe("fou".length);
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

    // An empty item holds no text, and an item is measured against the whole list: the empty line answers to
    // the same offset as the end of the item above it, which is where the cursor used to be put back.
    test("Should keep cursor on the br of an empty item after indent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), 0);
        range.setEnd(getFirstChild(wrapper, ".start"), 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        expectHtml(wrapper.innerHTML, `<ul><li>zero<ul><li><br></li></ul></li></ul>`);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("ul li ul li br"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    // The browser anchors the cursor on an empty item itself rather than on the br standing in for its line.
    test("Should keep cursor in an empty item the browser anchored the cursor on after indent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as HTMLElement, 0);
        range.setEnd(wrapper.querySelector(".start") as HTMLElement, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        expectHtml(wrapper.innerHTML, `<ul><li>zero<ul><li><br></li></ul></li></ul>`);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("ul li ul li br"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    // A selection reaching into an empty item ends on a line holding no text, which answers to the same
    // offset as the end of the item above it, so the empty item used to drop out of the selection.
    test("Should keep selection ending on an empty item after indent", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
                <li class="start">First ordered item</li>
                <li class="end"><br></li>
                <li>Third ordered item</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "Fi".length);
        range.setEnd(wrapper.querySelector(".end") as HTMLElement, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li>First ordered item</li>
                        <li><br></li>
                    </ol>
                </li>
                <li>Third ordered item</li>
            </ol>
        `);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("ol li ol li")?.firstChild);
        expect(cursorPosition.startOffset).toBe("Fi".length);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("ol li ol li br"));
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("Should keep selection starting on an empty item after indent", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>First ordered item</li>
                <li class="start"><br></li>
                <li class="end">Third ordered item</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as HTMLElement, 0);
        range.setEnd(getFirstChild(wrapper, ".end"), "Thi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.PlusIndent});

        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>First ordered item
                    <ol>
                        <li><br></li>
                        <li>Third ordered item</li>
                    </ol>
                </li>
            </ol>
        `);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("ol li ol li br"));
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("ol li ol li:last-child")?.firstChild);
        expect(cursorPosition.endOffset).toBe("Thi".length);
    });

    test("Should keep selection ending on an empty item after outdent", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li class="start">First ordered item</li>
                        <li class="end"><br></li>
                    </ol>
                </li>
                <li>Third ordered item</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "Fi".length);
        range.setEnd(wrapper.querySelector(".end") as HTMLElement, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.MinusIndent});

        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
                <li>First ordered item</li>
                <li><br></li>
                <li>Third ordered item</li>
            </ol>
        `);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("ol li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("Fi".length);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("ol li br"));
        expect(cursorPosition.endOffset).toBe(0);
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

    test("Should keep cursor on the br of an empty item after outdent", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start"><br></li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), 0);
        range.setEnd(getFirstChild(wrapper, ".start"), 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition: CursorPosition = execCommand(wrapper, {action: Action.MinusIndent});

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li><br></li></ul>`);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("ul li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe(0);
    });
});

describe("Keyboard command that empties a list item", () => {
    function keyboard(wrapper: HTMLElement, key: string) {
        return execCommand(wrapper, {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key})});
    }

    // An item is measured against the whole list, so the emptied line answers to the same offset as the end
    // of the item above it: the cursor has to stay on the line the command left it on.
    test("Should keep the cursor in the item backspace emptied", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">a</li></ul>`);
        const text = getFirstChild(wrapper, ".start");
        const range = new Range();
        range.setStart(text, "a".length);
        range.setEnd(text, "a".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = keyboard(wrapper, "Backspace");

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li class="start"><br></li></ul>`);
        expect(cursorPosition.startContainer.parentElement).toBe(wrapper.querySelector(".start"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    test("Should keep the cursor in the item delete emptied", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">a</li><li>first</li></ul>`);
        const text = getFirstChild(wrapper, ".start");
        const range = new Range();
        range.setStart(text, 0);
        range.setEnd(text, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = keyboard(wrapper, "Delete");

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li class="start"><br></li><li>first</li></ul>`);
        expect(cursorPosition.startContainer.parentElement).toBe(wrapper.querySelector(".start"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    // The typed text ends right before the nested list; a placeholder br left behind it would
    // resolve the cursor onto the nested item instead.
    test("Should keep the cursor on the text typed into an empty item holding a nested list", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start"><br><ul><li>child</li></ul></li></ul>`);
        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as HTMLElement, 0);
        range.setEnd(wrapper.querySelector(".start") as HTMLElement, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = keyboard(wrapper, "a");

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li class="start">a<ul><li>child</li></ul></li></ul>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("a".length);
    });

    // Backspace leaves the cursor on the text node it emptied, beside the placeholder it
    // added; typing there must take the placeholder away again.
    test("Should drop the placeholder when typing into an item backspace emptied", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">a<ul><li>child</li></ul></li></ul>`);
        const text = getFirstChild(wrapper, ".start");
        const range = new Range();
        range.setStart(text, "a".length);
        range.setEnd(text, "a".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = keyboard(wrapper, "Backspace");
        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li class="start"><br><ul><li>child</li></ul></li></ul>`);

        range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
        range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
        cursorPosition = keyboard(wrapper, "c");

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li class="start">c<ul><li>child</li></ul></li></ul>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("c".length);
    });

    test("Should drop the placeholder when typing into a paragraph backspace emptied", () => {
        const wrapper = createWrapper(`<p class="start">a</p><p>next</p>`);
        const text = getFirstChild(wrapper, ".start");
        const range = new Range();
        range.setStart(text, "a".length);
        range.setEnd(text, "a".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = keyboard(wrapper, "Backspace");
        expectHtml(wrapper.innerHTML, `<p class="start"><br></p><p>next</p>`);

        range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
        range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
        cursorPosition = keyboard(wrapper, "c");

        expectHtml(wrapper.innerHTML, `<p class="start">c</p><p>next</p>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("c".length);
    });
});

describe("Image command", () => {
    // The image command hands its file to a FileReader, so the insert lands turns after the command is over.
    async function waitForImage(wrapper: HTMLElement) {
        for (let attempt = 0; attempt < 100 && !wrapper.querySelector("img"); attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 1));
        }
    }

    function selection() {
        const range = window.getSelection()?.getRangeAt(0) as Range;

        return {container: range.startContainer, offset: range.startOffset};
    }

    // An empty block holds nothing but the br standing in for its line, which is the line the image is
    // dropped on: the image takes the block's place rather than being left with an empty line beside it.
    // The cursor never rests in the image block, so a paragraph is opened after it for the cursor.
    test("Should insert an image in an empty paragraph", async () => {
        const wrapper = createWrapper(`<p class="start"><br></p>`);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.Image, attributes: {image: new Blob(["image"], {type: "image/png"})}});
        await waitForImage(wrapper);

        const img = wrapper.querySelector("img") as HTMLElement;
        expect(img.parentElement?.nodeName).toBe("P");
        expect(img.parentElement?.className).toBe("be-image");
        expect(img.nextSibling).toBe(null);
        expect(wrapper.querySelectorAll("p").length).toBe(2);
        expect(wrapper.querySelector("br")?.parentElement).toBe(wrapper.lastElementChild);
        expect(selection().container).toBe(wrapper.querySelector("br"));
    });

    test("Should keep the paragraph the image is dropped at the end of", async () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.Image, attributes: {image: new Blob(["image"], {type: "image/png"})}});
        await waitForImage(wrapper);

        const paragraphs = wrapper.querySelectorAll("p");
        expect(paragraphs.length).toBe(3);
        expect(paragraphs[0]?.textContent).toBe("zero");
        expect(paragraphs[1]?.firstChild?.nodeName).toBe("IMG");
        expect(paragraphs[2]?.innerHTML).toBe("<br>");
        expect(selection().container).toBe(paragraphs[2]?.firstChild);
    });

    test("Should leave the cursor at the start of the line after an image dropped mid-line", async () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.Image, attributes: {image: new Blob(["image"], {type: "image/png"})}});
        await waitForImage(wrapper);

        const paragraphs = wrapper.querySelectorAll("p");
        expect(paragraphs.length).toBe(3);
        expect(paragraphs[0]?.textContent).toBe("ze");
        expect(paragraphs[1]?.className).toBe("be-image");
        expect(paragraphs[2]?.textContent).toBe("ro");
        expect(selection().container).toBe(paragraphs[2]?.firstChild);
        expect(selection().offset).toBe(0);
    });

    // An image block is never the block the cursor rests in, whatever a command leaves it on.
    test("Should move the cursor a command left in an image block to the line after it", () => {
        const wrapper = createWrapper(`<p class="be-image"><img src="image.png"></p><p class="after">zero</p>`);

        const range = new Range();
        range.setStart(wrapper.querySelector(".be-image") as Node, 0);
        range.setEnd(wrapper.querySelector(".be-image") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = execCommand(wrapper, {action: Action.Click, event: new MouseEvent("click")});

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p><p class="after">zero</p>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".after"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    // Clicking an image selects it as a range around the img; bold has nothing to wrap there.
    test("Should leave a selected image block alone when a tag is applied", () => {
        const wrapper = createWrapper(`<p class="be-image"><img src="image.png"></p><p class="after">zero</p>`);

        const range = new Range();
        range.setStart(wrapper.querySelector(".be-image") as Node, 0);
        range.setEnd(wrapper.querySelector(".be-image") as Node, 1);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p><p class="after">zero</p>`);
        // The image stays selected, the same as before the command.
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector(".be-image"));
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(1);
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

        expectHtml(wrapper.innerHTML, `<p>text</p>`);
    });

    test("Should join the lists the removed table stood between", () => {
        const wrapper = createWrapper(`
            <ul><li class="item">zero</li></ul>
            <table><thead><tr><th class="head">head</th></tr></thead></table>
            <ul><li>first</li></ul>
        `);
        const cell = wrapper.querySelector(".head") as HTMLTableCellElement;
        select(wrapper, ".item");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteRow, table: {cell}});

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
        const expectedContainer = getFirstChild(wrapper, "li");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("zero".length);
        expect(cursorPosition.endOffset).toBe("zero".length);
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

        expectHtml(wrapper.innerHTML, `<p>text</p>`);
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

        // After: <tr><td>zero</td><td>first</td></tr><tr><td></td><td></td></tr>
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

        expectCursorAt(cursorPosition, getFirstChild(wrapper, "p"), "text".length);
    });

    test("Should move the cursor to the block after a table that opened the editor", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="head">zero</th></tr></thead></table>
            <p class="text">text</p>
        `);
        const cell = selectCell(wrapper, ".head");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteColumn, table: {cell}});

        expectCursorAt(cursorPosition, getFirstChild(wrapper, "p"), 0);
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
            <table><thead><tr><th></th><th></th></tr></thead>
            <tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody></table>
        `);
    });

    test("Should build a table of a single header cell", () => {
        const wrapper = createWrapper(`<p class="start">first</p>`);
        selectAt(wrapper, ".start", "first".length);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <p class="start">first</p>
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
            <p class="start">first</p>
        `);
    });

    test("Should take the place of the empty block the cursor is in", () => {
        const wrapper = createWrapper(`<p class="start"><br></p>`);
        selectAt(wrapper, ".start", 0);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th></th></tr></thead></table>
        `);
    });

    test("Should leave the blocks around the empty one the table takes the place of", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <p class="start"><br></p>
            <p>second</p>
        `);
        selectAt(wrapper, ".start", 0);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <table><thead><tr><th></th></tr></thead></table>
            <p>second</p>
        `);
    });

    // An empty block is the line the cursor is on and nothing more, so the heading it was written as goes
    // with it: there is no content left for the heading to be the heading of.
    test("Should take the place of an empty heading", () => {
        const wrapper = createWrapper(`<h1 class="start"><br></h1>`);
        selectAt(wrapper, ".start", 0);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th></th></tr></thead></table>
        `);
    });

    test("Should drop the empty item the table splits the list at", () => {
        const wrapper = createWrapper(`
            <ul><li>zero</li><li class="start"><br></li></ul>
        `);
        selectAt(wrapper, ".start", 0);

        execCommand(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li></ul>
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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
            <table><thead><tr><th></th></tr></thead></table>
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

        // An empty cell holds nothing for the cursor to take, so it takes the cell itself.
        const firstCell = wrapper.querySelector("th");
        expect(cursorPosition.startContainer).toBe(firstCell);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endContainer).toBe(firstCell);
        expect(cursorPosition.endOffset).toBe(0);
    });
});

// The browser places a click's cursor only once the event is over, so the editor has to leave the
// selection alone for the placement to survive. jsdom drives no selection of its own, so what is
// pinned here is that decision: whether the command writes a selection at all.
describe("Click command", () => {
    // The carrier is static, so a test that leaves one behind would follow the next one into its first command.
    beforeEach(() => Carrier.removeCarrier());

    function stubSelection() {
        const selection = {removeAllRanges: jest.fn(), addRange: jest.fn()} as unknown as Selection;
        jest.spyOn(window, "getSelection").mockReturnValue(selection);

        return selection;
    }

    function select(wrapper: HTMLElement, selector: string, start: number, end: number) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, selector), start);
        range.setEnd(getFirstChild(wrapper, selector), end);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    function selectCursor(cursorPosition: CursorPosition) {
        const range = new Range();
        range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
        range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    test("Should leave a plain click's cursor to the browser", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        select(wrapper, ".start", "".length, "zero".length);

        const selection = stubSelection();
        const focus = jest.spyOn(wrapper, "focus");
        const event = new MouseEvent("click");
        const preventDefault = jest.spyOn(event, "preventDefault");

        const cursorPosition = execCommand(wrapper, {action: Action.Click, event});

        expect(selection.removeAllRanges).not.toHaveBeenCalled();
        expect(selection.addRange).not.toHaveBeenCalled();
        expect(focus).not.toHaveBeenCalled();
        expect(preventDefault).not.toHaveBeenCalled();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        // The selection it started from is still what it hands back, untouched.
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    test("Should place the cursor itself when the click drops a carrier", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "ze".length, "ze".length);
        selectCursor(execCommand(wrapper, {action: Action.Tag, tag: "STRONG"}));
        expect(Carrier.isCarrierExist()).toBe(true);

        const selection = stubSelection();
        const focus = jest.spyOn(wrapper, "focus");
        const event = new MouseEvent("click");
        const preventDefault = jest.spyOn(event, "preventDefault");

        execCommand(wrapper, {action: Action.Click, event});

        // The rebuilt block is not the one the browser aimed at, and its default action is suppressed
        // along with the placement, so the command names the spot itself.
        expect(preventDefault).toHaveBeenCalled();
        expect(selection.removeAllRanges).toHaveBeenCalled();
        expect(selection.addRange).toHaveBeenCalled();
        expect(focus).toHaveBeenCalled();
        expect(Carrier.isCarrierExist()).toBe(false);
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);
    });
});

// An empty block holds no text of its own, so the browser anchors the cursor on the block element itself.
// The block is rebuilt from its leaves, and only leaves keep their identity through the rebuild, so a cursor
// left on the block would come back pointing at a node that has left the document - the browser drops such a
// selection, and the editor is then focused with no cursor at all, which lands the next character typed at
// the very start of the document.
describe("Block command with the cursor on an empty block", () => {
    function selectBlock(wrapper: HTMLElement, selector: string) {
        const block = wrapper.querySelector(selector) as HTMLElement;
        const range = new Range();
        range.setStart(block, 0);
        range.setEnd(block, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        return block;
    }

    function selectCursor(cursorPosition: CursorPosition) {
        const range = new Range();
        range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
        range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    test("Should keep the cursor in the block when an empty line becomes a heading", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start"><br></p>`);
        selectBlock(wrapper, ".start");

        const cursorPosition = execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        expectHtml(wrapper.innerHTML, `<p>zero</p><h1><br></h1>`);
        const heading = wrapper.querySelector("h1") as HTMLElement;
        expect(cursorPosition.startContainer).toBe(heading.firstChild);
        expect(cursorPosition.startContainer.isConnected).toBe(true);
        expect(cursorPosition.endContainer).toBe(heading.firstChild);
    });

    test("Should keep the cursor in the block when an empty line becomes a list", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start"><br></p>`);
        selectBlock(wrapper, ".start");

        const cursorPosition = execCommand(wrapper, {action: Action.List, tag: "UL"});

        expectHtml(wrapper.innerHTML, `<p>zero</p><ul><li><br></li></ul>`);
        const item = wrapper.querySelector("li") as HTMLElement;
        expect(cursorPosition.startContainer).toBe(item.firstChild);
        expect(cursorPosition.startContainer.isConnected).toBe(true);
    });

    // The cursor the command leaves behind is the one the next command starts from, so an empty line can be
    // turned into a heading and back without the cursor ever leaving it.
    test("Should keep the cursor in the block when the heading is turned back into a paragraph", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start"><br></p>`);
        selectBlock(wrapper, ".start");

        selectCursor(execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"}));
        expectHtml(wrapper.innerHTML, `<p>zero</p><h1><br></h1>`);
        const cursorPosition = execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        expectHtml(wrapper.innerHTML, `<p>zero</p><p><br></p>`);
        const paragraph = wrapper.querySelectorAll("p")[1] as HTMLElement;
        expect(cursorPosition.startContainer).toBe(paragraph.firstChild);
        expect(cursorPosition.startContainer.isConnected).toBe(true);
    });

    // The text of a block is a leaf, so it is the same node before and after - the cursor on it needs no help.
    test("Should keep the cursor on the text of a block that holds some", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const text = getFirstChild(wrapper, ".start");
        selectBlock(wrapper, ".start");

        const cursorPosition = execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        expectHtml(wrapper.innerHTML, `<h1>zero</h1>`);
        expect(cursorPosition.startContainer).toBe(text);
        expect(cursorPosition.startContainer.isConnected).toBe(true);
    });
});

// A select-all anchors the selection on the editable element itself. It is read from the leaves it spans, so
// the document is edited the way a selection of its text is: a character typed over it lands in the first block,
// and a delete leaves an empty paragraph rather than a document with no line to write on.
describe("Keyboard command that empties the document", () => {
    function selectAll(wrapper: HTMLElement) {
        const range = new Range();
        range.setStart(wrapper, 0);
        range.setEnd(wrapper, wrapper.childNodes.length);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    function keyboard(wrapper: HTMLElement, key: string) {
        return execCommand(wrapper, {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key})});
    }

    test("Should leave an empty paragraph with the cursor in it when the whole document is deleted", () => {
        const wrapper = createWrapper(`<p>zero</p><p>first</p>`);
        selectAll(wrapper);

        const cursorPosition = keyboard(wrapper, "Backspace");

        expectHtml(wrapper.innerHTML, `<p><br></p>`);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("br"));
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.startContainer.isConnected).toBe(true);
    });

    test("Should type into a paragraph when a character replaces the whole document", () => {
        const wrapper = createWrapper(`<p>zero</p><p>first</p>`);
        selectAll(wrapper);

        const cursorPosition = keyboard(wrapper, "a");

        expectHtml(wrapper.innerHTML, `<p>a</p>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p"));
        expect(cursorPosition.startOffset).toBe("a".length);
        expect(cursorPosition.endOffset).toBe("a".length);
    });

    test("Should type into the paragraph the deleted document was given back", () => {
        const wrapper = createWrapper(`<p>zero</p>`);
        selectAll(wrapper);
        selectCursor(keyboard(wrapper, "Backspace"));

        const cursorPosition = keyboard(wrapper, "a");

        expectHtml(wrapper.innerHTML, `<p>a</p>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p"));
    });

    // A table is no first level element, but it is a document of its own all the same - wrapping it in a
    // paragraph would nest it in one.
    test("Should leave a document that is only a table alone", () => {
        const wrapper = createWrapper(`<table><tbody><tr><td class="start">a</td></tr></tbody></table>`);
        const text = getFirstChild(wrapper, ".start");
        const range = new Range();
        range.setStart(text, "a".length);
        range.setEnd(text, "a".length);
        (getRange as jest.Mock).mockReturnValue(range);

        keyboard(wrapper, "b");

        expectHtml(wrapper.innerHTML, `<table><tbody><tr><td class="start">ab</td></tr></tbody></table>`);
    });

    function selectCursor(cursorPosition: CursorPosition) {
        const range = new Range();
        range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
        range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
        (getRange as jest.Mock).mockReturnValue(range);
    }
});

describe("Delete image command", () => {
    function select(wrapper: HTMLElement, selector: string) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, selector), "".length);
        range.setEnd(getFirstChild(wrapper, selector), "".length);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    function image(wrapper: HTMLElement) {
        return wrapper.querySelector("img") as HTMLImageElement;
    }

    test("Should remove the image block and land the cursor at the end of the block before", () => {
        const wrapper = createWrapper(`
            <p class="text">text</p>
            <p class="be-image"><img src="image.png"></p>
            <p class="after">after</p>
        `);
        select(wrapper, ".after");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteImage, image: image(wrapper)});

        expectHtml(wrapper.innerHTML, `<p>text</p><p class="after">after</p>`);
        const expectedContainer = getFirstChild(wrapper, "p");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("text".length);
        expect(cursorPosition.endOffset).toBe("text".length);
    });

    test("Should land the cursor at the start of the block after when the image opened the editor", () => {
        const wrapper = createWrapper(`
            <p class="be-image"><img src="image.png"></p>
            <p class="after">after</p>
        `);
        select(wrapper, ".after");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteImage, image: image(wrapper)});

        expectHtml(wrapper.innerHTML, `<p>after</p>`);
        const expectedContainer = getFirstChild(wrapper, "p");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    // The image block was a line of its own, so removing it leaves the lists it stood between
    // side by side; the run is rebuilt as one for them to join.
    test("Should join the lists the removed image block stood between", () => {
        const wrapper = createWrapper(`
            <ul><li class="item">zero</li></ul>
            <p class="be-image"><img src="image.png"></p>
            <ul><li>first</li></ul>
        `);
        select(wrapper, ".item");

        const cursorPosition = execCommand(wrapper, {action: Action.DeleteImage, image: image(wrapper)});

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
        const expectedContainer = getFirstChild(wrapper, "li");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("zero".length);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    test("Should leave an empty paragraph when the image was the only block", () => {
        const wrapper = createWrapper(`<p class="be-image"><img src="image.png"></p>`);
        const range = new Range();
        range.setStart(wrapper, 0);
        range.setEnd(wrapper, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.DeleteImage, image: image(wrapper)});

        expectHtml(wrapper.innerHTML, `<p><br></p>`);
    });

    test("Should ignore an image outside an image block", () => {
        const wrapper = createWrapper(`<p class="text">text<img src="image.png"></p>`);
        select(wrapper, ".text");

        execCommand(wrapper, {action: Action.DeleteImage, image: image(wrapper)});

        expectHtml(wrapper.innerHTML, `<p class="text">text<img src="image.png"></p>`);
    });

    test("Should ignore an image outside the editor", () => {
        const wrapper = createWrapper(`<p class="text">text</p>`);
        select(wrapper, ".text");
        const outside = document.createElement("img");

        execCommand(wrapper, {action: Action.DeleteImage, image: outside});

        expectHtml(wrapper.innerHTML, `<p class="text">text</p>`);
    });
});

describe("Modify class command", () => {
    function select(wrapper: HTMLElement, selector: string) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, selector), "".length);
        range.setEnd(getFirstChild(wrapper, selector), "".length);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    test("Should remove, add and toggle classes in that order", () => {
        const wrapper = createWrapper(`<p class="text">text</p><p class="be-image be-image-small"><img src="image.png"></p>`);
        select(wrapper, ".text");
        const element = wrapper.querySelector(".be-image") as HTMLElement;

        execCommand(wrapper, {
            action: Action.ModifyClass,
            element,
            classes: {remove: ["be-image-small"], add: ["be-image-large"], toggle: ["be-image-large", "other"]}
        });

        expectHtml(wrapper.innerHTML, `<p class="text">text</p><p class="be-image other"><img src="image.png"></p>`);
    });

    test("Should toggle a class the element lacks on", () => {
        const wrapper = createWrapper(`<p class="text">text</p><p class="be-image"><img src="image.png"></p>`);
        select(wrapper, ".text");
        const element = wrapper.querySelector(".be-image") as HTMLElement;

        execCommand(wrapper, {action: Action.ModifyClass, element, classes: {toggle: ["be-image-medium"]}});

        expectHtml(wrapper.innerHTML, `<p class="text">text</p><p class="be-image be-image-medium"><img src="image.png"></p>`);
    });

    test("Should ignore an element outside the editor", () => {
        const wrapper = createWrapper(`<p class="text">text</p>`);
        select(wrapper, ".text");
        const element = document.createElement("p");

        execCommand(wrapper, {action: Action.ModifyClass, element, classes: {add: ["other"]}});

        expect(element.className).toBe("");
        expectHtml(wrapper.innerHTML, `<p class="text">text</p>`);
    });
});

// A paste places the cursor itself - in the first cell of a pasted table, on the line after a pasted
// image block - so the anchor read before the command must not be restored over it: an offset can't
// tell the end of the line before the table or image from the start of what follows.
describe("Cursor position after a paste command", () => {
    function pasteEvent(html: string): ClipboardEvent {
        const event = new Event("paste", {cancelable: true, bubbles: true});
        Object.defineProperty(event, "clipboardData", {value: {getData: () => html} as unknown as DataTransfer});

        return event as ClipboardEvent;
    }

    function selectItems(wrapper: HTMLElement) {
        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), 0);
        range.setEnd(getLastChild(wrapper, ".end"), getLastChild(wrapper, ".end").textContent?.length ?? 0);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    test("Should leave the cursor on the item after a pasted image block", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end">one</li><li>two</li></ul>`);
        selectItems(wrapper);

        const cursorPosition = execCommand(wrapper, {action: Action.Clipboard, event: pasteEvent(`<p>fourth</p><img src="x">`)});

        expectHtml(wrapper.innerHTML, `<ul><li>fourth</li></ul><p class="be-image"><img src="x"></p><ul><li>two</li></ul>`);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "ul:last-child li"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    test("Should leave the cursor in the first cell of a pasted table", () => {
        const wrapper = createWrapper(`<p class="start end">fourth</p>`);
        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = execCommand(wrapper, {action: Action.Clipboard,
            event: pasteEvent(`<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table>`)});

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "th"));
        expect(cursorPosition.startOffset).toBe(0);
    });
});
