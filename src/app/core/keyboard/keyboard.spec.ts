import {createWrapper, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {handleKeyboardEvent} from "@/core/keyboard/keyboard";

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
        handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><br></p><p>first</p>
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
        handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p><br></p><p>first</p>
        `);
    });

    test("Pressing enter when cursor is at the end of paragraph before the next paragraph. Cursor position should be between paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
        const paragraphBetween = wrapper.querySelectorAll("p")[1];

        expect(cursorPosition.startContainer.parentElement).toBe(paragraphBetween);
        expect(cursorPosition.endContainer.parentElement).toBe(paragraphBetween);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("Pressing enter when cursor is at the start of paragraph after the next paragraph. Cursor position should be between paragraphs", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
        const lastParagraph = wrapper.querySelectorAll("p")[2];

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p><br></p>
            <p>first</p>
        `)

        expect(cursorPosition.startContainer.parentElement).toBe(lastParagraph);
        expect(cursorPosition.endContainer.parentElement).toBe(lastParagraph);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("After pressing enter when cursor is at the br cursor position should be at next br", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start"><br></p><p>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
        const brTag = wrapper.querySelectorAll("p")[2];

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p class="start"><br></p><p><br></p><p>first</p>
        `);

        expect(cursorPosition.startContainer.parentElement).toBe(brTag);
        expect(cursorPosition.endContainer.parentElement).toBe(brTag);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
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
        handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p>second</p>
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
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p>second</p>
        `);

        const expectedStart = wrapper.querySelectorAll("p")[1]?.firstChild;
        const expectedEnd = wrapper.querySelectorAll("p")[1]?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedStart);
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(expectedEnd);
        expect(cursorPosition.endOffset).toBe("".length);
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
        handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><strong>st</strong>second</p>
        `);
    });

    test("Press enter when cursor is at the beginning of tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><strong>first</strong>second</p>
        `);

        const expectedContainer = getFirstChild(wrapper, "strong");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("Press shift+enter when cursor is at the beginning of tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter", shiftKey: true});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zero<br><strong>first</strong>second</p>
        `);

        const expectedContainer = getFirstChild(wrapper, "strong");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("Press delete when selection spans two paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p><p class="end">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>fio</p>
        `);

        expect((wrapper.querySelector("p") as HTMLElement).childNodes.length).toBe(1);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p"));
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, "p"));
        expect(cursorPosition.startOffset).toBe(2);
        expect(cursorPosition.endOffset).toBe(2);
    });

    test("After pressing delete when cursor is at the br cursor position should be at previous br", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p><br></p><p><br></p><p class="start"><br></p><p>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
        const brTag = wrapper.querySelectorAll("p")[2];

        expect(cursorPosition.startContainer.parentElement).toBe(brTag);
        expect(cursorPosition.endContainer.parentElement).toBe(brTag);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });
});

describe("Typing and deleting characters", () => {
    function selectText(node: Node, start: number, end: number) {
        const range = new Range();
        range.setStart(node, start);
        range.setEnd(node, end);
        (getRange as jest.Mock).mockReturnValue(range);
    }

    test("Type a character in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "x"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zexro</p>
        `);
        expect((wrapper.querySelector("p") as HTMLElement).childNodes.length).toBe(1);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("zex".length);
        expect(cursorPosition.endOffset).toBe("zex".length);
    });

    test("Type a character in an empty paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start"><br></p>
        `);
        selectText(getFirstChild(wrapper, ".start"), 0, 0);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "a"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">a</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("a".length);
    });

    test("Press backspace in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zro</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("z".length);
    });

    test("Press delete in the middle of text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zeo</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("ze".length);
    });

    test("Press backspace at the start of text after an inline tag", () => {
        const wrapper = createWrapper(`
            <p class="start">ze<strong>ro</strong>tail</p>
        `);
        selectText(getLastChild(wrapper, ".start"), 0, 0);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze<strong>r</strong>tail</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "strong"));
        expect(cursorPosition.startOffset).toBe("r".length);
    });

    test("Press delete at the end of text before an inline tag", () => {
        const wrapper = createWrapper(`
            <p class="start">ze<strong>ro</strong></p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze<strong>o</strong></p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "strong"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    test("Press backspace on the last character of an inline tag", () => {
        const wrapper = createWrapper(`
            <p>ze<strong class="start">r</strong>tail</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "r".length, "r".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>zetail</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p"));
        expect(cursorPosition.startOffset).toBe("ze".length);
    });

    test("Press backspace on the last character of the only paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">a</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "a".length, "a".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start"><br></p>
        `);
        expect(cursorPosition.startContainer.parentElement).toBe(wrapper.querySelector("p"));
        expect(cursorPosition.startOffset).toBe(0);
    });

    test("Press backspace after a line break", () => {
        const wrapper = createWrapper(`
            <p class="start">a<br>b</p>
        `);
        selectText(getLastChild(wrapper, ".start"), 0, 0);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>ab</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p"));
        expect(cursorPosition.startOffset).toBe("a".length);
    });

    test("Press delete before a line break", () => {
        const wrapper = createWrapper(`
            <p class="start">a<br>b</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "a".length, "a".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>ab</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p"));
        expect(cursorPosition.startOffset).toBe("a".length);
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
        selectText(getFirstChild(wrapper, ".start"), "".length, "".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero</li>
                <li>first</li>
                <li>second</li>
            </ol>
        `);

        const expectedContainer = wrapper.querySelector("ol li:last-child")?.firstChild;
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("".length);
    });

    test("Press backspace when selection is inside one paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirst</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "zerofi".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zerst</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("ze".length);
    });

    test("Type a character over a selection inside one paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirst</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "zerofi".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "x"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zexrst</p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("zex".length);
    });

    test("Type a character over a fully selected inline tag", () => {
        const wrapper = createWrapper(`
            <p>ze<strong class="start">ro</strong></p>
        `);
        selectText(getFirstChild(wrapper, ".start"), 0, "ro".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "x"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p>ze<strong class="start">x</strong></p>
        `);
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("x".length);
    });

    test("Press backspace after an emoji", () => {
        const wrapper = createWrapper(`
            <p class="start">a👍</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "a👍".length, "a👍".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">a</p>
        `);
        expect(cursorPosition.startOffset).toBe("a".length);
    });

    // A cell is no block, so enter has nothing to split and is dropped rather than left to the browser.
    test("Enter inside a cell keeps a table of empty cells", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="start"></th><th></th></tr></thead>
            <tbody><tr><td></td><td></td></tr></tbody></table>
        `);
        const cell = wrapper.querySelector(".start") as HTMLElement;
        selectText(cell, 0, 0);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter", cancelable: true});
        const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th class="start"></th><th></th></tr></thead>
            <tbody><tr><td></td><td></td></tr></tbody></table>
        `);
        expect(cell.isConnected).toBe(true);
        expect(keyboardEvent.defaultPrevented).toBe(true);
        expect(cursorPosition.startContainer).toBe(cell);
        expect(cursorPosition.startOffset).toBe(0);
    });

    test("Enter in the middle of a cell leaves its text whole", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);
        const text = getFirstChild(wrapper, ".start");
        selectText(text, "ze".length, "ze".length);

        const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);
        expect(cursorPosition.startContainer).toBe(text);
        expect(cursorPosition.startOffset).toBe("ze".length);
    });

    // A break would grow the row instead of ending a line, so shift does not make an exception.
    test("Shift and enter in the middle of a cell inserts no break", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter", shiftKey: true}));

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);
    });

    // A selection reaching out of the table would take the split with it, so the cell it starts in is
    // enough to drop the enter.
    test("Enter over a selection running out of a cell keeps both blocks", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td></tr></tbody></table><p class="end">first</p>
        `);
        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">zero</td></tr></tbody></table><p class="end">first</p>
        `);
    });

    // The editor is a block of a page it knows nothing about, and that page may well be laid out in a
    // table. Only the tables the editor holds itself count, so the search for one stops at the editor.
    test("Enter splits a paragraph of an editor embedded in a table of the page", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);
        const cell = document.createElement("td");
        wrapper.replaceWith(cell);
        cell.appendChild(wrapper);
        const row = document.createElement("tr");
        row.appendChild(cell);
        const table = document.createElement("table");
        table.appendChild(row);
        document.body.appendChild(table);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

        expectHtml(wrapper.innerHTML, `
            <p>ze</p><p>ro</p>
        `);
    });

    test("Arrow keys do not change the dom and are not prevented", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);
        selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);

        const keyboardEvent = new KeyboardEvent("keydown", {key: "ArrowLeft"});
        const preventDefault = jest.spyOn(keyboardEvent, "preventDefault");
        handleKeyboardEvent(wrapper, keyboardEvent);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
        `);
        expect(preventDefault).not.toHaveBeenCalled();
    });
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

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), 0);
        range.setEnd(getFirstChild(wrapper, ".start"), 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p><br></p>
            <ul>
                <li>first</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p br"));
        expect(cursorPosition.startOffset).toBe(0);
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
        const range = new Range();
        range.setStart(br, 0);
        range.setEnd(br, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

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

        expect(cursorPosition.startContainer).toBe(br);
    });

    test("Enter in an item holding an image only inserts an item, the image being content of its own", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><img src="image.png"></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as Element, 0);
        range.setEnd(wrapper.querySelector(".start") as Element, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start"><img src="image.png"></li>
                <li><br></li>
            </ul>
        `);
    });

    test("Shift enter in an empty item keeps the item in the list", () => {
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

        handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter", shiftKey: true}));

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li class="start"><br></li>
            </ul>
        `);
    });

    test("Enter over a selection emptying an item divides the item, the item not having been empty", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start"></li>
                <li><br></li>
            </ul>
        `);
    });
});
