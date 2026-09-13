import {createWrapper, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
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

    // A heading is a line of words for the item it is dropped in, and the words standing beside it are a
    // line of their own: the two are divided by a break inside the item.
    test("Should paste a heading and the words beside it into an item as its lines", () => {
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
                <li>zethird<br><strong>fourth</strong>ro
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);
    });

    // The item the cursor rests on dictates the shape: a heading dropped in it is words of the item, and
    // the list nested below the item stays where it is.
    test("Should paste a lone heading into an item holding a nested list as words of it", () => {
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
                <li>zerothird
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);
    });

    test("Should paste a lone paragraph into the middle of a heading keeping the heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">first</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p><strong>zero</strong></p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>fi<strong>zero</strong>rst</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("strong")?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("strong")?.firstChild);
        expect(cursorPosition.startOffset).toBe("zero".length);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    // The line the cursor is on dictates the tag: a heading dropped in a paragraph is words of it.
    test("Should paste a lone heading into the middle of a paragraph as words of it", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h2>zero</h2>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>fizerorst</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("fizero".length);
    });

    test("Should paste a lone blockquote into the middle of a paragraph as words of it", () => {
        const wrapper = createWrapper(`
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<blockquote>zero</blockquote>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>fizerorst</p>
        `);
    });

    // A copy carries the block it was taken from, so words copied out of a heading come back as one; dropped
    // in a heading they are words of it, whatever kind of heading either is.
    test("Should paste a lone heading into a heading of its own kind as words of it", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h1>first</h1>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zefirstro</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("h1")?.firstChild);
        expect(cursorPosition.startOffset).toBe("zefirst".length);
    });

    test("Should paste a lone heading into a heading of another kind as words of it", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h2>first</h2>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>zefirstro</h1>
        `);
    });

    // Copied words come wrapped in the block they were taken from, and a paragraph's words are words of
    // whatever line they are dropped on.
    test("Should paste a lone paragraph into the middle of a list item as words of it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zefirstro</li>
            </ul>
        `);
    });

    test("Should paste what was copied out of a heading into a paragraph as words of it", () => {
        const wrapper = createWrapper(`
            <h1 class="source">Editor Reference Guide</h1>
            <p class="start">zero</p>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".source"), "Editor ".length);
        copyRange.setEnd(getFirstChild(wrapper, ".source"), "Editor Reference".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1 class="source">Editor Reference Guide</h1>
            <p>zeReferencero</p>
        `);
    });

    test("Should paste what was copied out of a heading into a heading as words of it", () => {
        const wrapper = createWrapper(`
            <h1 class="source">Editor Reference Guide</h1>
            <h1 class="start">zero</h1>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".source"), "Editor ".length);
        copyRange.setEnd(getFirstChild(wrapper, ".source"), "Editor Reference".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1 class="source">Editor Reference Guide</h1>
            <h1>zeReferencero</h1>
        `);
    });

    test("Should paste what was copied out of a paragraph into a heading as words of it", () => {
        const wrapper = createWrapper(`
            <p class="source">Editor Reference Guide</p>
            <h1 class="start">zero</h1>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".source"), "Editor ".length);
        copyRange.setEnd(getFirstChild(wrapper, ".source"), "Editor Reference".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p class="source">Editor Reference Guide</p>
            <h1>zeReferencero</h1>
        `);
    });

    // An empty line has no words to join, so it gives its tag up: what is pasted takes its place as it came.
    test("Should take the place of an empty heading with what was copied out of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="source">Editor Reference Guide</p>
            <h1><br></h1>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".source"), "Editor ".length);
        copyRange.setEnd(getFirstChild(wrapper, ".source"), "Editor Reference".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p class="source">Editor Reference Guide</p>
            <p>Reference</p>
        `);
    });

    test("Should paste what was copied out of an item into a paragraph as a list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="source">first</li>
            </ul>
            <p class="start">zero</p>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".source"), "f".length);
        copyRange.setEnd(getFirstChild(wrapper, ".source"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="source">first</li>
            </ul>
            <p>ze</p>
            <ul>
                <li>ir</li>
            </ul>
            <p>ro</p>
        `);
    });

    // A lone line is words of the line it is dropped on at its edges too: nothing opens a line of its own.
    test("Should paste a lone heading at the end of a paragraph as words of it", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h1>first</h1>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("zerofirst".length);
    });

    test("Should paste a lone heading at the start of a paragraph as words of it", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>firstzero</p>
        `);
    });

    test("Should take the place of the empty paragraph a lone heading is pasted into", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>first</h1>
        `);
    });

    test("Should paste a lone heading into the middle of an item as words of it", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>second</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zesecondro</li>
                <li>first</li>
            </ul>
        `);
    });

    // The editor writes its lines as paragraphs and knows no div, so a pasted one arrives as the paragraph
    // it stands for and its words go on the line they are dropped on.
    test("Should keep the line when a lone div is pasted into a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<div>first</div>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zefirstro</p>
        `);
    });

    // The blocks a div holds are lifted out of it and read as the lines they are.
    test("Should paste the blocks a pasted div holds as lines of the paragraph's kind", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<div><h1>first</h1><p>second</p></div>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>secondro</p>
        `);
    });

    test("Should take the place of an empty heading with a lone paragraph", () => {
        const wrapper = createWrapper(`
            <h1><br></h1>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>zero</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
        `);
    });

    test("Should paste a lone paragraph wrapped in fragment markers into a heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">first</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<!--StartFragment--><p>zero</p><!--EndFragment-->`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>fizerorst</h1>
        `);
    });

    test("Should paste a heading and a paragraph into a nested item as its lines", () => {
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
                        <li>firthird<br>fourthst</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[1]?.lastChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("li")[1]?.lastChild);
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

    test("Should keep the item and its wrapper when the selection runs into the nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">first
                    <ul>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `);

        // What a drag across the whole list gives: from the line the item was written as into the list
        // nested under it. The item is what stands between the two, so without it the line is copied as
        // loose words and the wrapper around it is never reached.
        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const html = getSelectedHtml(getCursorPosition());

        expect(html).toBe(`<ul><li class="start">first<ul><li class="end">second</li></ul></li></ul>`);
    });

    // The copy carries the tags the selection was made in, so words copied out of an item come as a list.
    test("Should keep the item and its wrapper of words copied inside a single item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "li"), "f".length);
        range.setEnd(getFirstChild(wrapper, "li"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        expect(getSelectedHtml(getCursorPosition())).toBe("<ul><li>ir</li></ul>");
    });

    test("Should keep the heading of words copied inside a heading", () => {
        const wrapper = createWrapper(`
            <h1>Editor Reference Guide</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "h1"), "Editor ".length);
        range.setEnd(getFirstChild(wrapper, "h1"), "Editor Reference".length);
        (getRange as jest.Mock).mockReturnValue(range);

        expect(getSelectedHtml(getCursorPosition())).toBe("<h1>Reference</h1>");
    });

    test("Should keep the paragraph of words copied inside a paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p"), "zero ".length);
        range.setEnd(getFirstChild(wrapper, "p"), "zero fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        expect(getSelectedHtml(getCursorPosition())).toBe("<p>fir</p>");
    });

    test("Should keep the heading and the formatting of words copied across a tag inside a heading", () => {
        const wrapper = createWrapper(`
            <h1>Editor <strong>Reference</strong> Guide</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "h1"), "Edi".length);
        range.setEnd(getLastChild(wrapper, "h1"), " Gu".length);
        (getRange as jest.Mock).mockReturnValue(range);

        expect(getSelectedHtml(getCursorPosition())).toBe("<h1>tor <strong>Reference</strong> Gu</h1>");
    });

    test("Should keep every item and wrapper of words copied inside a nested item", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        expect(getSelectedHtml(getCursorPosition())).toBe(`<ol><li><ol><li class="start">rst</li></ol></li></ol>`);
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

    test("Should paste multiple paragraphs at the end of a heading as headings", () => {
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
            <h1>zerofirst</h1>
            <h1>second</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
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

    // A paragraph written beside a list is a line of its own: a list dropped in it goes between its halves,
    // not into the list next door, and the paragraph's words are not lost to it.
    test("Should paste a list into the middle of a paragraph standing after a list", () => {
        const wrapper = createWrapper(`
            <ul><li>first</li></ul>
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ul><li>second</li></ul>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul><li>first</li></ul>
            <p>ze</p>
            <ul><li>second</li></ul>
            <p>ro</p>
        `);
    });

    test("Should paste a list into the middle of a paragraph standing before a list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul><li>first</li></ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ul><li>second</li></ul>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze</p>
            <ul><li>second</li></ul>
            <p>ro</p>
            <ul><li>first</li></ul>
        `);
    });

    // A copy carries the shape the selection was made in: a selection running from a nested item into the
    // item below it opens on an item holding nothing but the nested list. The list is read back from its
    // lines before it is placed, which drops that item and levels the lines that follow from one another.
    test("Should paste a list copied from a nested item into the item below it as its lines", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<ol><li><ol><li>first</li></ol></li><li>second</li></ol>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <ol>
                <li>first</li>
                <li>second</li>
            </ol>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    test("Should paste what was copied from a nested item into the item below it as a list of its lines", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li class="from">first</li>
                    </ol>
                </li>
                <li class="to">second</li>
            </ol>
            <p class="start">third</p>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".from"), "".length);
        copyRange.setEnd(getFirstChild(wrapper, ".to"), "second".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "third".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>zero
                    <ol>
                        <li class="from">first</li>
                    </ol>
                </li>
                <li class="to">second</li>
            </ol>
            <p>third</p>
            <ol>
                <li>first</li>
                <li>second</li>
            </ol>
        `);
    });

    test("Should take the place of the empty paragraph a list copied from a nested item is pasted into", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ol><li><ol><li>first</li></ol></li><li>second</li></ol>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ol>
                <li>first</li>
                <li>second</li>
            </ol>
        `);
    });

    test("Should divide the item a list copied from a nested item is pasted into", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ol><li><ol><li>first</li></ol></li><li>second</li></ol>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>ze</li>
            </ul>
            <ol>
                <li>first</li>
                <li>second</li>
            </ol>
            <ul>
                <li>ro</li>
            </ul>
        `);
    });

    test("Should keep the nesting below the item a copied list opens on", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ol><li><ol><li>first<ol><li>second</li></ol></li></ol></li></ol>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <ol>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);
    });

    test("Should read every pasted run of lists back on its own", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<ul><li>first</li></ul><p>second</p><ol><li><ol><li>third</li></ol></li><li>fourth</li></ol>`,
            getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <ul>
                <li>first</li>
            </ul>
            <p>second</p>
            <ol>
                <li>third</li>
                <li>fourth</li>
            </ol>
        `);
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
            <h1>zefirst</h1>
            <h1>secondro</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should paste multiple paragraphs to the middle of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>secondro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });

    test("Should paste multiple paragraphs to the end of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst</p>
            <p>second</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    test("Should paste multiple paragraphs before a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>first</p>
            <p>secondzero</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    test("Should paste multiple paragraphs into an empty paragraph without keeping its placeholder br", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>first</p>
            <p>second</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    // Every pasted line is words of the line it is dropped on, so headings pasted into a heading join its
    // halves the way paragraphs do.
    test("Should join multiple headings pasted into the middle of a heading of their own kind to its halves", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<h1>first</h1><h1>second</h1>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zefirst</h1>
            <h1>secondro</h1>
        `);
    });

    test("Should join a heading opening a run pasted into a heading of its own kind and the paragraph closing it", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h1>first</h1><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zefirst</h1>
            <h1>secondro</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    // A line standing between the two a run opens and closes with has no half of the target to join, so
    // it is a line of its own - written in the target's tag all the same.
    test("Should write a run of mixed lines pasted into a heading in its kind", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><blockquote>second</blockquote><h1>third</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>zefirst</h1>
            <h1>second</h1>
            <h1>thirdro</h1>
        `);
    });

    test("Should join a heading opening a run pasted into a heading of another kind", () => {
        const wrapper = createWrapper(`
            <h2 class="start">zero</h2>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h2>zefirst</h2>
            <h2>secondro</h2>
        `);
    });

    test("Should join a blockquote and a heading pasted into a blockquote to its halves", () => {
        const wrapper = createWrapper(`
            <blockquote class="start">zero</blockquote>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<blockquote>first</blockquote><h1>second</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <blockquote>zefirst</blockquote>
            <blockquote>secondro</blockquote>
        `);
    });

    // An item holds a single line, so the lines pasted into it stay inside it, divided by breaks.
    test("Should paste a heading and a paragraph into a list item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<h1>first</h1><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zefirst<br>secondro</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("li")?.lastChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    test("Should paste what was copied from a heading into the paragraph below it into a heading as its words", () => {
        const wrapper = createWrapper(`
            <h1 class="from">zero</h1>
            <p class="to">first</p>
            <h1 class="start">second</h1>
        `);

        const copyRange = new Range();
        copyRange.setStart(getFirstChild(wrapper, ".from"), "ze".length);
        copyRange.setEnd(getFirstChild(wrapper, ".to"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(copyRange);
        const copied = getSelectedHtml(getCursorPosition());

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);
        pasteHtml(wrapper, copied, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1 class="from">zero</h1>
            <p class="to">first</p>
            <h1>sero</h1>
            <h1>ficond</h1>
        `);
    });

    // The paragraphs a run opens and closes with are words of the line they are dropped in. A paragraph
    // standing between them has no line of the target to join and keeps one of its own.
    test("Should keep the line of a paragraph standing between the two a run opens and closes with", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p><p>third</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>second</p>
            <p>thirdro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[2]?.firstChild);
        expect(cursorPosition.startOffset).toBe("third".length);
    });

    test("Should write the heading standing between the paragraphs a run opens and closes with as a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><h1>second</h1><p>third</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>second</p>
            <p>thirdro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("p")[2]?.firstChild);
        expect(cursorPosition.startOffset).toBe("third".length);
    });

    test("Should join a heading opening a run and the paragraph closing it to the halves of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>secondro</p>
        `);
    });

    test("Should join a paragraph opening a run and the heading closing it to the halves of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><h1>second</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>secondro</p>
        `);
    });

    // A paragraph pasted at either end of a line has nothing to join there, so it keeps a line of its own -
    // written in the tag of the line it was dropped on, like every pasted line.
    test("Should write a paragraph closing a run pasted at the end of a heading as a heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>zerofirst</h1>
            <h1>second</h1>
        `);
    });

    test("Should write a paragraph opening a run pasted at the start of a heading as a heading", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>first</h1>
            <h1>secondzero</h1>
        `);
    });

    // A paragraph standing for an empty line is nothing to join a line with, so it keeps a line of its own.
    test("Should keep the line of an empty paragraph opening a run", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><br></p><p>first</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze</p>
            <p><br></p>
            <p>firstro</p>
        `);
    });

    test("Should paste paragraphs around a heading into the middle of an item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>second</p><h1>third</h1><p>fourth</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zesecond<br>third<br>fourthro</li>
                <li>first</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[0]?.lastChild);
        expect(cursorPosition.startOffset).toBe("fourth".length);
    });

    // The list standing in the middle of the run is placed beside the one it was dropped in, and the two
    // are joined into a single wrapper - the paragraph closing the run still finds the item that took over
    // the rest of the line.
    test("Should join a pasted list standing between the paragraphs a run opens and closes with", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><ul><li>second</li></ul><p>third</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zefirst</li>
                <li>second</li>
                <li>thirdro</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("li")[2]?.firstChild);
        expect(cursorPosition.startOffset).toBe("third".length);
    });

    // A block on its own keeps the line it is pasted into: words copied from a page arrive wrapped in a
    // block of their own, and such a paste must not divide the line the cursor is on.
    test("Should keep the line when a single paragraph is pasted into a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<p>first</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zefirstro</p>
        `);
    });

    // A lone br is the empty line it was copied from: dropped into a line it is the space between the words
    // on either side, not a break dividing them.
    test("Should paste an empty paragraph into the middle of a paragraph as a space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p><br></p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("ze ".length);
        expect(cursorPosition.endOffset).toBe("ze ".length);
    });

    // The parser drops a space standing before anything that would open a body, which is all a copied space is.
    test("Should paste a bare space into the middle of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, ` `, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("ze ".length);
        expect(cursorPosition.endOffset).toBe("ze ".length);
    });

    // A space read off the system clipboard comes with the charset the browser wrote in front of it.
    test("Should paste a bare space led by a charset meta into the middle of a paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<meta charset="utf-8"> `, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);
    });

    // An empty line selected from the end of the line before it is copied as two blocks, and they are one
    // space, not a run of lines to place between blocks.
    test("Should paste an empty line copied with the block before it into the middle of a paragraph as a space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p></p><p><br></p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("ze ".length);
    });

    test("Should paste an empty line copied with the block before it into the middle of a heading as a space", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p></p><p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>ze ro</h1>
        `);
    });

    test("Should paste an empty line copied with the block before it into the middle of a list item as a space", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero</li></ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p></p><p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul><li>ze ro</li></ul>
        `);
    });

    test("Should leave an empty paragraph alone when an empty line copied with the block before it is pasted into it", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p></p><p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p><br></p>
        `);
    });

    // An empty line copied inside the editor is a bare br, and it goes the same way.
    test("Should paste a bare br into the middle of a paragraph as a space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<br>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);
    });

    // Formatting around a lone br is nothing to keep.
    test("Should paste a formatted lone br into the middle of a paragraph as a space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><b><br></b></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);
    });

    // A space written into an emptied block would leave one with no br to hold its line open.
    test("Should leave an empty paragraph alone when an empty paragraph is pasted into it", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p><br></p>
        `);
    });

    test("Should paste an empty paragraph into the middle of a list item as a space", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero</li></ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul><li>ze ro</li></ul>
        `);
    });

    test("Should paste an empty paragraph into the middle of a cell as a space", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>ze ro</td><td>first</td></tr></tbody></table>
        `);
    });

    // Whitespace goes the way a lone br does: the formatting wrapped around it is nothing to keep.
    test("Should paste formatted whitespace into the middle of a paragraph as a plain space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<b> </b>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("p")?.firstChild);
        expect(cursorPosition.startOffset).toBe("ze ".length);
    });

    test("Should paste a formatted no-break space as a plain space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b>&nbsp;</b>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);
    });

    test("Should paste a run of formatted blanks as one space", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b> </b><i> </i>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze ro</p>
        `);
    });

    // Text beside the whitespace is a paste of its own and keeps what wraps it.
    test("Should keep the formatting of pasted text beside whitespace", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b> a</b>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze<b> a</b>ro</p>
        `);
    });

    test("Should paste nothing for formatting holding nothing", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b></b>`, getCursorPosition());

        // The paste is empty once the tag is dropped, so it returns before anything is rebuilt
        // and the markup is left exactly as it was, the marker class included.
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
        `);
    });

    // An empty tag isn't content the block's br is replaced by: the paste holds nothing once the tag is
    // dropped, so the block is left as it was.
    test("Should leave an empty paragraph alone when formatting holding nothing is pasted into it", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b></b>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p><br></p>
        `);
    });

    test("Should leave an empty paragraph alone when a paragraph holding nothing is pasted into it", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p><br></p>
        `);
    });

    test("Should leave an empty paragraph alone when nested formatting holding nothing is pasted into it", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><b><i></i></b></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p><br></p>
        `);
    });

    test("Should drop formatting holding nothing standing among pasted lines", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>a</p><b></b><p>b</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>a</p><p>b</p>
        `);
    });

    // An empty cell is a cell of its table, not an empty tag to drop.
    test("Should keep the empty cells of a pasted table", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<table><tbody><tr><td>a</td><td></td></tr></tbody></table>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>a</td><td></td></tr></tbody></table>
        `);
    });

    test("Should leave an empty paragraph alone when formatted whitespace is pasted into it", () => {
        const wrapper = createWrapper(`
            <p><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b> </b>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p><br></p>
        `);
    });

    // Several brs are lines of their own: each pasted empty line keeps a line of its own between the halves.
    test("Should paste several empty paragraphs into the middle of a paragraph as lines", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p><br></p><p><br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>ze</p>
            <p><br></p>
            <p><br></p>
            <p>ro</p>
        `);
    });

    // A br standing beside text is a break in that text, not an empty line.
    test("Should keep a br pasted beside text as a break", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>a<br></p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zea<br>ro</p>
        `);
    });

    test("Should paste multiple paragraphs at the start of a heading as headings", () => {
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
            <h1>first</h1>
            <h1>secondzero</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
        expect(cursorPosition.endContainer).toBe(wrapper.querySelectorAll("h1")[1]?.firstChild);
        expect(cursorPosition.startOffset).toBe("second".length);
        expect(cursorPosition.endOffset).toBe("second".length);
    });
});

// The line the cursor is on dictates the tag: a pasted paragraph, heading or blockquote carries words for
// it. Inside an item those words stay in the item, one line below another.
describe("Paste lines into the line the cursor is on", () => {
    test("Should paste several paragraphs into the middle of an item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>second</p><p>third</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zesecond<br>thirdro</li>
                <li>first</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("li")?.lastChild);
        expect(cursorPosition.startOffset).toBe("third".length);
    });

    test("Should paste several paragraphs at the end of an item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zerofirst<br>second</li>
            </ul>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("li")?.lastChild);
        expect(cursorPosition.startOffset).toBe("second".length);
    });

    test("Should paste several paragraphs at the start of an item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first<br>secondzero</li>
            </ul>
        `);
    });

    // An empty item has no tag to give up, so it is filled the way any item is.
    test("Should paste several paragraphs into an empty item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li><br></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li>first<br>second</li>
            </ul>
        `);
    });

    test("Should paste several headings into an item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1><h2>second</h2><blockquote>third</blockquote>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zefirst<br>second<br>thirdro</li>
            </ul>
        `);
    });

    // An empty line among the pasted ones is an empty line of the item: the breaks around it stand for it.
    test("Should keep an empty line pasted among lines into an item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><p><br></p><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zefirst<br><br>secondro</li>
            </ul>
        `);
    });

    // Markup copied from a page can wrap its blocks in formatting; the blocks are lifted out of it and
    // read as the lines they are, so they stay inside the item.
    test("Should paste paragraphs wrapped in formatting into an item as its lines", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<b style="font-weight: normal"><p>first</p><p>second</p></b>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zefirst<br>secondro</li>
            </ul>
        `);
    });

    test("Should paste a lone heading at the end of a heading of another kind as words of it", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h2>first</h2>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>zerofirst</h1>
        `);
    });

    test("Should paste a lone heading at the start of a heading of another kind as words of it", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h2>first</h2>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>firstzero</h1>
        `);
    });

    test("Should paste three paragraphs into the middle of a heading as headings", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<p>first</p><p>second</p><p>third</p>`, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <h1>zefirst</h1>
            <h1>second</h1>
            <h1>thirdro</h1>
        `);

        expect(cursorPosition.startContainer).toBe(wrapper.querySelectorAll("h1")[2]?.firstChild);
        expect(cursorPosition.startOffset).toBe("third".length);
    });

    // A page writes a quote as paragraphs inside a blockquote; the paragraphs are lifted out of it and
    // each is a line of its own.
    test("Should paste the paragraphs a blockquote holds into a paragraph as its lines", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<blockquote>\n<p>first</p>\n<p>second</p>\n</blockquote>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>secondro</p>
        `);
    });

    // Words standing beside a block are a line of their own, written in the tag of the line they land in.
    test("Should paste a heading and the words beside it into a paragraph as its lines", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1>second`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>zefirst</p>
            <p>secondro</p>
        `);
    });

    test("Should paste lines around a list into the halves of a heading as headings", () => {
        const wrapper = createWrapper(`
            <h1 class="start">zero</h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><ul><li>second</li></ul><p>third</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>zefirst</h1>
            <ul>
                <li>second</li>
            </ul>
            <h1>thirdro</h1>
        `);
    });

    // An empty line has no words to join, so it gives its tag up: the pasted blocks take its place as they
    // came, a paragraph included.
    test("Should take the place of an empty heading with a lone heading of another kind", () => {
        const wrapper = createWrapper(`
            <h2><br></h2>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<h1>first</h1>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <h1>first</h1>
        `);
    });

    test("Should take the place of an empty heading with several paragraphs", () => {
        const wrapper = createWrapper(`
            <h1><br></h1>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("br") as Node, 0);
        range.setEnd(wrapper.querySelector("br") as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<p>first</p><p>second</p>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <p>first</p>
            <p>second</p>
        `);
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

    // The br standing in for the line of an empty block is what the table takes the place of, not
    // something to keep beside it.
    test("Should take the place of the empty paragraph the cursor is in", () => {
        const wrapper = createWrapper(`
            <p class="start"><br></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, table, cursorPosition);

        expectHtml(wrapper.innerHTML, table);

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

    // The lines pasted along with the table are words of the halves the table divides the line into.
    test("Should join the lines pasted along with the table to the halves of the line", () => {
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
            <p>foufifth</p>` + table + `
            <p>sixthrth</p>
        `);
    });

    // The blocks the table is lifted out of are divs, which arrive as the paragraphs they stand for, so the
    // words on either side of it join the line it was dropped in.
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
            <p>foufifth</p>` + table + `
            <p>sixthrth</p>
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

    test("Should paste only the words of a pasted div", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">zero</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        pasteHtml(wrapper, `<div>first</div>`, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr><td>zefirstro</td></tr></tbody></table>
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

    // Dropping the image leaves its formatting holding nothing, which goes the same way as the image.
    test("Should paste nothing when the pasted content is an image inside formatting", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr><td class="start">foo</td><td>bar</td></tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fo".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        let cursorPosition = getCursorPosition();
        cursorPosition = pasteHtml(wrapper, `<b><img src="${image}"></b>`, cursorPosition);

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