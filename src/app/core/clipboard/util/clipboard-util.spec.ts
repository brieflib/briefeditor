import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {getSelectedHtml, pasteHtml} from "@/core/clipboard/util/clipboard-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

const image = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

describe("Sanitize input", () => {
    test("Should paste into an empty paragraph without keeping its placeholder br", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `word`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>word</p>
        `);
    });

    test("Should paste into an empty list item without keeping its placeholder br", () => {
        const wrapper = createWrapper(`
            <ul><li>zero</li><li><br></li></ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `word`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li><li>word</li></ul>
        `);
    });

    // The br left in the item is content the pasted items are divided around, which buries the second one
    // in a list of its own nested in the first.
    test("Should paste items into an empty list item as items of its list", () => {
        const wrapper = createWrapper(`
            <ul><li><br></li></ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ul><li>zero</li><li>first</li></ul>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li><li>first</li></ul>
        `);
    });

    test("Should keep the line breaks of what is pasted into an empty paragraph", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `zero<br>first`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zero<br>first</p>
        `);
    });

    test("Should insert p", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "f".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "f".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<p><strong style="margin: 0">second<span class="test">third</span></strong></p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>f<strong>second<span>third</span></strong>irst</p>
        `);
    });

    test("Should keep a pasted image outside of a table", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "first".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<p>second<img src="${image}"> third</p>`, cursorPosition);

        expect(wrapper.querySelectorAll("img").length).toBe(1);
        expect(wrapper.textContent).toBe("firstsecond third");
    });

    test("Should insert html outside of formating elements (em)", () => {
        const wrapper = createWrapper(`
            <p><em class="start">first</em></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "f".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "f".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<strong style="margin: 0">second</strong>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p><em>f</em><strong>second</strong><em>irst</em></p>
        `);
    });

    test("Should insert html outside of formating elements (a)", () => {
        const wrapper = createWrapper(`
            <p><em>zero</em><em><a class="start">first</a></em></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "f".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "f".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<strong style="margin: 0">second</strong>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p><em>zero</em><a><em>f</em></a><strong>second</strong><a><em>irst</em></a></p>
        `);
    });

    test("Should insert html outside of formating elements (a) after content", () => {
        const wrapper = createWrapper(`
            <p><strong>zero</strong>,<em>first</em>,<u>second</u>,<a class="start">third</a>.</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "t".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "t".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<strong style="margin: 0">second</strong>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p><strong>zero</strong>,<em>first</em>,<u>second</u>,<a>t</a><strong>second</strong><a>hird</a>.</p>
        `);
    });

    test("Should insert heading outside of list dividing it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<h1>third</h1><strong>fourth</strong>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>ze</li>
            </ul>
            <h1>third</h1>
            <ul>
                <li><strong>fourth</strong>ro
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);
    });

    test("Should insert heading outside of list normalizing it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<h1>third</h1>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <h1>third</h1>
            <ol>
                <li>first</li>
            </ol>
            <ul>
                <li>second</li>
            </ul>
        `);
    });

    test("Should insert heading and p outside of list normalizing it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fir".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h1>third</h1><p>fourth</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li>fir</li>
                    </ol>
                </li>
            </ul>
            <h1>third</h1>
            <p>fourth</p>
            <ol>
                <li>st</li>
            </ol>
            <ul>
                <li>second</li>
            </ul>            
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("fourth".length);
        expect(cursorPosition.endOffset).toBe("fourth".length);
    });

    test("Should serialize selection keeping literal hrefs", () => {
        const wrapper = createWrapper(`
            <p class="start"><a href="#">first</a> <a href="/foo">second</a> <a href="https://example.com/x">third</a></p>
        `);

        const range = new Range();
        range.selectNodeContents(wrapper.querySelector(".start") as Node);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        expect(html).toContain(`href="#"`);
        expect(html).toContain(`href="/foo"`);
        expect(html).toContain(`href="https://example.com/x"`);
        expect(html).not.toContain("localhost");
    });

    test("Should keep enclosing inline ancestors when selection is inside them", () => {
        const wrapper = createWrapper(`
            <p><strong><a href="/bar" class="start">hello</a></strong></p>
        `);

        const link = getFirstChild(wrapper, ".start"); // "hello" text node inside the <a>
        const range = new Range();
        range.setStart(link, "h".length);
        range.setEnd(link, "hell".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        expect(html).toContain(`href="/bar"`);
        expect(html).toContain("<strong>");
        expect(html).toContain("ell");
        expect(html).not.toContain("localhost");
    });

    test("Should keep the table of copied body cells", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th>zero</th><th>first</th></tr></thead>` +
            `<tbody><tr><td>second</td><td>third</td></tr>` +
            `<tr><td>fourth</td><td>fifth</td></tr></tbody></table>
        `);

        const cells = wrapper.querySelectorAll("td");
        const range = new Range();
        range.setStartBefore(cells[0] as Node);
        range.setEndAfter(cells[1] as Node);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        // Only the copied cells travel: the shallow clones carry no rows of their own.
        expectHtml(html, `<table><tbody><tr><td>second</td><td>third</td></tr></tbody></table>`);
    });

    test("Should keep the header of copied header cells", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th>zero</th><th>first</th></tr></thead>` +
            `<tbody><tr><td>second</td><td>third</td></tr></tbody></table>
        `);

        const cells = wrapper.querySelectorAll("th");
        const range = new Range();
        range.setStartBefore(cells[0] as Node);
        range.setEndAfter(cells[1] as Node);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        expectHtml(html, `<table><thead><tr><th>zero</th><th>first</th></tr></thead></table>`);
    });

    test("Should copy the text of a selection held inside one cell", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">second</td><td>third</td></tr></tbody></table>
        `);

        const cell = getFirstChild(wrapper, ".start"); // "second" text node inside the <td>
        const range = new Range();
        range.setStart(cell, "s".length);
        range.setEnd(cell, "seco".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        expect(html).toBe("eco");
    });

    test("Should insert text inside p", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `first`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>first</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("first".length);
        expect(cursorPosition.endOffset).toBe("first".length);
    });

    test("Should insert multiple paragraphs to heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
            <p>first</p>
            <p>second</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should pasted list before heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<ul><li>first</li><li>second</li></ul>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
            <h1>zero</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should pasted list after heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<ul><li>first</li><li>second</li></ul>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should paste lis after heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<li>first</li><li>second</li>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should paste lis with nested list after heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<li>first</li><ul><li>second</li></ul><li>third</li>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
            <ul>
                <li>first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
                <li>third</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[2]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("li")[2]?.firstChild);
        expect(cursorPosition.startOffset).toBe("third".length);
        expect(cursorPosition.endOffset).toBe("third".length);
    });

    test("Should paste list to the middle of heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<ul><li>first</li><li>second</li></ul>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>ze</h1>
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
            <h1>ro</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should keep list wrapper of copied list items", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>first</li>
                <li>second</li>
            </ol>
        `);

        const items = wrapper.querySelectorAll("li");
        const range = new Range();
        range.setStart(items[0]?.firstChild as Node, "".length);
        range.setEnd(items[1]?.firstChild as Node, "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        expect(html).toBe(`<ol><li>first</li><li>second</li></ol>`);
    });

    test("Should paste multiple paragraphs to the middle of heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>ze</h1>
            <p>first</p>
            <p>second</p>
            <h1>ro</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should paste multiple paragraphs before the heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>first</p>
            <p>second</p>
            <h1>zero</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });
});

describe("Paste a table", () => {
    const table = `<table><thead><tr><th>zero</th><th>first</th></tr></thead>` +
        `<tbody><tr><td>second</td><td>third</td></tr></tbody></table>`;

    test("Should divide the paragraph the cursor is in", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>` + table + `<p>rth</p>
        `);

        const firstCell = wrapper.querySelector("th");
        expect(cursorPosition.startContainer).toBe(firstCell?.firstChild);
        expect(cursorPosition.startOffset).toBe(0);
    });

    test("Should go before the paragraph the cursor starts in", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, table + `
            <p>fourth</p>
        `);
    });

    test("Should go after the paragraph the cursor ends in", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fourth".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fourth</p>` + table);
    });

    test("Should divide the list the cursor is in", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">fourth
                    <ol>
                        <li>fifth</li>
                    </ol>
                </li>
                <li>sixth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>fou</li>
            </ul>` + table + `
            <ul>
                <li>rth
                    <ol>
                        <li>fifth</li>
                    </ol>
                </li>
                <li>sixth</li>
            </ul>
        `);
    });

    test("Should go before the list the cursor starts in", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">fourth</li>
                <li>fifth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, table + `
            <ul>
                <li>fourth</li>
                <li>fifth</li>
            </ul>
        `);
    });

    test("Should go after the list the cursor ends in", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>fourth</li>
                <li class="start">fifth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fifth".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fifth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>fourth</li>
                <li>fifth</li>
            </ul>` + table);
    });

    test("Should keep the blocks pasted along with the table", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<h1>fifth</h1>` + table + `<p>sixth</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>
            <h1>fifth</h1>` + table + `
            <p>sixth</p>
            <p>rth</p>
        `);
    });

    test("Should lift the table out of the block holding it", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<div>fifth` + table + `sixth</div>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>
            <div>fifth</div>` + table + `
            <div>sixth</div>
            <p>rth</p>
        `);
    });

    test("Should give copied body cells an empty header", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<table><tbody><tr><td>second</td><td>third</td></tr></tbody></table>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>
            <table><thead><tr><th></th><th></th></tr></thead>` +
            `<tbody><tr><td>second</td><td>third</td></tr></tbody></table>
            <p>rth</p>
        `);
    });

    test("Should keep the header of copied header cells", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<table><thead><tr><th>zero</th><th>first</th></tr></thead></table>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>
            <table><thead><tr><th>zero</th><th>first</th></tr></thead></table>
            <p>rth</p>
        `);
    });

    test("Should fill up the rows a ragged copy left short", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<table><tbody><tr><td>second</td><td>third</td></tr>` +
            `<tr><td>fifth</td></tr></tbody></table>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>
            <table><thead><tr><th></th><th></th></tr></thead>` +
            `<tbody><tr><td>second</td><td>third</td></tr>` +
            `<tr><td>fifth</td><td></td></tr></tbody></table>
            <p>rth</p>
        `);
    });

    test("Should drop the blocks the lifted table leaves empty", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fou".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fou".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<div><p>` + table + `</p></div>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fou</p>` + table + `<p>rth</p>
        `);
    });

    test("Should lift the table out of the list item holding it", () => {
        const wrapper = createWrapper(`
            <p class="start">fourth</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fourth".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<ul><li>fifth</li><li>` + table + `</li><li>sixth</li></ul>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fourth</p>
            <ul>
                <li>fifth</li>
            </ul>` + table + `
            <ul>
                <li>sixth</li>
            </ul>
        `);
    });
});

describe("Paste into a table cell", () => {
    test("Should paste only the children of the pasted paragraphs", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>fofirstsecondo</td><td>bar</td></tr></tbody></table>
        `);

        const cell = wrapper.querySelector("td");
        expect(cursorPosition.startContainer).toBe(cell?.firstChild);
        expect(cursorPosition.endContainer).toBe(cell?.firstChild);
        expect(cursorPosition.startOffset).toBe("fofirstsecond".length);
        expect(cursorPosition.endOffset).toBe("fofirstsecond".length);
    });

    test("Should paste only the children of the pasted heading into a header cell", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th class="start">zero</th><th>first</th></tr></thead></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h1>second</h1>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th>secondzero</th><th>first</th></tr></thead></table>
        `);

        const cell = wrapper.querySelector("th");
        expect(cursorPosition.startContainer).toBe(cell?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    test("Should keep the inline markup of the pasted content", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "foo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "foo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<p><strong>first</strong> second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>foo<strong>first</strong> second</td><td>bar</td></tr></tbody></table>
        `);
    });

    test("Should paste only the children of the pasted list", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "foo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "foo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<ul><li>first</li><li>second</li></ul>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>foofirstsecond</td><td>bar</td></tr></tbody></table>
        `);
        expect(wrapper.querySelectorAll("ul, li").length).toBe(0);
    });

    test("Should paste only the children of a pasted table", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "foo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "foo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<table><tbody><tr><td>first</td><td>second</td></tr></tbody></table>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>foofirstsecond</td><td>bar</td></tr></tbody></table>
        `);
        expect(wrapper.querySelectorAll("table").length).toBe(1);
    });

    test("Should drop a pasted image and keep the words around it", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "foo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "foo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<p>first<img src="${image}"> second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>foofirst second</td><td>bar</td></tr></tbody></table>
        `);
        expect(wrapper.querySelectorAll("img").length).toBe(0);
    });

    test("Should paste nothing when the pasted content is an image alone", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<img src="${image}">`, cursorPosition);

        // The paste is empty once the image is dropped, so it returns before anything is
        // rebuilt and the markup is left exactly as it was, the marker class included.
        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const cell = wrapper.querySelector("td");
        expect(cursorPosition.startContainer).toBe(cell?.firstChild);
        expect(cursorPosition.startOffset).toBe("fo".length);
        expect(cursorPosition.endOffset).toBe("fo".length);
    });

    test("Should preserve the rest of the table", () => {
        const wrapper = createWrapper(`
            <table><thead><tr><th>zero</th><th></th></tr></thead>` +
            `<tbody><tr><td class="start">first</td><td>second <strong>third</strong></td></tr>` +
            `<tr><td></td><td>fourth</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "first".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<p>fifth</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th>zero</th><th></th></tr></thead>` +
            `<tbody><tr><td>firstfifth</td><td>second <strong>third</strong></td></tr>` +
            `<tr><td></td><td>fourth</td></tr></tbody></table>
        `);
    });
});