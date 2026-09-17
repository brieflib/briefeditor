import {changeBlock, removeBlock, tag} from "@/core/command/util/command-util";
import {getRange} from "@/core/shared/range-util";
import {Action} from "@/core/command/type/command";
import {createWrapper, expectCursor, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Unwrap tag", () => {
    test("Should unwrap strong from selection", () => {
        const wrapper = createWrapper(`
            <p>
                <strong>
                    <u class="end"><i class="start">zero</i>first</u>
                </strong>
                second
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getLastChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Unwrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p > u > i"), "".length, wrapper.querySelector("p > u")?.lastChild, "fi".length);

        expectHtml(wrapper.innerHTML, `
             <p>
                <strong>
                    <u>
                        <i>ze</i>
                    </u>
                </strong>
                <u><i>ro</i>fi</u>
                <strong>
                    <u>rst</u>
                </strong>
                second
            </p>
        `);
    });

    test("Should unwrap whole strong tag", () => {
        const wrapper = createWrapper(`
            <p><strong class="start">zero</strong>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Unwrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "".length, getFirstChild(wrapper, "p"), "zero".length);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst</p>
        `);
    });

    test("Should unwrap strong from different li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>ze<strong class="start">ro</strong></li>
                <li><strong class="end">fir</strong>st</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Unwrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "ze".length, getFirstChild(wrapper, "li + li"), "fir".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `);
    });

    test("Should unwrap part of strong from different li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li><strong class="start">zero</strong></li>
                <li><strong class="end">first</strong></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Unwrap);
        expectCursor(cursorPosition, getLastChild(wrapper, "li"), "".length, getFirstChild(wrapper, "li + li"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li><strong>ze</strong>ro</li>
                <li>fi<strong>rst</strong></li>
            </ul>
        `);
    });

    test("Should unwrap strong from different cells", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr>
                <td><strong class="start">zero</strong></td>
                <td><strong class="end">first</strong></td>
            </tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Unwrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "td"), "".length, getFirstChild(wrapper, "td + td"), "first".length);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr>
                <td>zero</td>
                <td>first</td>
            </tr></tbody></table>
        `);
    });
});

describe("Wrap in tag", () => {
    test("Should wrap selection in italic", () => {
        const wrapper = createWrapper(`
            <p class="end"><strong class="start">zero</strong>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getLastChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "em", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "em"), "".length, getFirstChild(wrapper, "em"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <p><strong>zero</strong><em>fi</em>rst</p>
        `);
    });

    test("Should wrap selection from the different paragraphs in italic", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p>
                <strong>first</strong>
            </p>
            <p class="end">second</p>        
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zer".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "em", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p > em"), "".length, getFirstChild(wrapper, "p:last-child > em"), "se".length);

        expectHtml(wrapper.innerHTML, `
            <p>zer<em>o</em></p>
            <p>
                <strong>
                    <em>first</em>
                </strong>
            </p>
            <p><em>se</em>cond</p>
        `);
    });

    test("Should wrap selection from different elements in bold", () => {
        const wrapper = createWrapper(`
            <p class="start">zero 
                <strong class="end">first</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zer".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "strong", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "strong"), "".length, getFirstChild(wrapper, "strong"), "o  fi".length);

        expectHtml(wrapper.innerHTML, `
            <p>zer<strong>o first</strong></p>
        `);
    });

    test("Should wrap selection in bold when cursor is at the end of element", () => {
        const wrapper = createWrapper(`
            <p>ze<strong class="start">r</strong>o</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "r".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "strong", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "strong"), "r".length, getFirstChild(wrapper, "p + p strong"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <p>ze<strong>ro</strong></p>
            <p><strong>fi</strong>rst</p>
        `);
    });

    test("Should wrap unordered list in bold", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>
                    zero
                    <u class="start">first</u>
                    <em>second</em>
                </li>
                <li>third</li>
                <li class="end">fourth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "strong", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "strong > u"), "".length, getFirstChild(wrapper, "li:last-child > strong"), "fo".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <u>fi</u>
                    <strong>
                        <u>rst</u>
                        <em>second</em>
                    </strong>
                </li>
                <li>
                    <strong>third</strong>
                </li>
                <li><strong>fo</strong>urth</li>
            </ul>
        `);
    });

    test("Should wrap unordered list and paragraph in bold", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "strong", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li > strong"), "".length, getFirstChild(wrapper, "p > strong"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>ze<strong>ro</strong></li>
            </ul>
            <p><strong>fi</strong>rst</p>
        `);
    });

    // A range extracted across cells clones the cells it cuts through, so each cell is wrapped on its own.
    test("Should wrap the selected text of each cell on its own", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr>
                <td class="start">zero</td>
                <td>first</td>
                <td class="end">second</td>
            </tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "td > strong"), "".length, getFirstChild(wrapper, "td:last-child > strong"), "se".length);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr>
                <td>ze<strong>ro</strong></td>
                <td><strong>first</strong></td>
                <td><strong>se</strong>cond</td>
            </tr></tbody></table>
        `);
    });

    test("Should wrap cells across a header and a body row", () => {
        const wrapper = createWrapper(`
            <table>
                <thead><tr><th class="start">zero</th></tr></thead>
                <tbody><tr><td class="end">first</td></tr></tbody>
            </table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "th > strong"), "".length, getFirstChild(wrapper, "td > strong"), "first".length);

        expectHtml(wrapper.innerHTML, `
            <table>
                <thead><tr><th><strong>zero</strong></th></tr></thead>
                <tbody><tr><td><strong>first</strong></td></tr></tbody>
            </table>
        `);
    });

    test("Should leave an empty cell between wrapped cells alone", () => {
        const wrapper = createWrapper(`
            <table><tbody><tr>
                <td class="start">zero</td>
                <td></td>
                <td class="end">first</td>
            </tr></tbody></table>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "td > strong"), "".length, getFirstChild(wrapper, "td:last-child > strong"), "first".length);

        expectHtml(wrapper.innerHTML, `
            <table><tbody><tr>
                <td><strong>zero</strong></td>
                <td></td>
                <td><strong>first</strong></td>
            </tr></tbody></table>
        `);
    });

    // A selected image is a range around the img inside its block; there is nothing inline to tag there.
    test("Should not wrap an image block", () => {
        const wrapper = createWrapper(`<p class="be-image"><img src="image.png"></p>`);

        const range = new Range();
        range.setStart(wrapper.querySelector(".be-image") as Node, 0);
        range.setEnd(wrapper.querySelector(".be-image") as Node, 1);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Wrap);
        expectCursor(cursorPosition, wrapper.querySelector(".be-image"), 0, wrapper.querySelector(".be-image"), 1);

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p>`);
    });

    test("Should skip the image block a selection spans", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="be-image"><img src="image.png"></p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Wrap);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p > strong"), "".length, getFirstChild(wrapper, "p:last-child > strong"), "first".length);

        expectHtml(wrapper.innerHTML, `
            <p><strong>zero</strong></p>
            <p class="be-image"><img src="image.png"></p>
            <p><strong>first</strong></p>
        `);
    });

    test("Should leave the empty line of an item holding a nested list alone", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><br>
                    <ol>
                        <li>nested</li>
                    </ol>
                </li>
                <li class="end">last</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as Node, 0);
        range.setEnd(getFirstChild(wrapper, ".end"), "last".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "STRONG", Action.Wrap);
        expectCursor(cursorPosition, wrapper.querySelector("li > br"), 0, getFirstChild(wrapper, "ul > li:last-child > strong"), "last".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li><br>
                    <ol>
                        <li><strong>nested</strong></li>
                    </ol>
                </li>
                <li><strong>last</strong></li>
            </ul>
        `);
    });
});

describe("Change first level", () => {
    test("Should change paragraph to heading", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["H1"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "h1"), "".length, getFirstChild(wrapper, "h1"), "zer".length);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
        `);
    });

    test("Should wrap strong in heading", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["H1"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "h1 > strong"), "".length, getFirstChild(wrapper, "h1 > strong"), "zer".length);

        expectHtml(wrapper.innerHTML, `
            <h1>
                <strong>zero</strong>
            </h1>
        `);
    });

    test("Should wrap strong in unordered list", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL", "LI"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li > strong"), "".length, getFirstChild(wrapper, "li > strong"), "zer".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>
                    <strong>zero</strong>
                </li>
            </ul>
        `);
    });

    test("Should unwrap list to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li>
                            <strong class="start">first</strong>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p > strong"), "".length, getFirstChild(wrapper, "p > strong"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p>
                <strong>first</strong>
            </p>
        `);
    });

    test("Should change ordered list to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "".length, getFirstChild(wrapper, "p"), "zer".length);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
        `);
    });

    test("Should wrap paragraph element to ordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
            </ul>
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL", "LI"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li + li"), "".length, getFirstChild(wrapper, "li + li"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `);
    });

    test("Should change tag from the li to the paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li>second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "".length, getFirstChild(wrapper, "p"), "fir".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p>first</p>
            <ul>
                <li>second</li>
            </ul>
        `);
    });

    // test("Should insert unordered list", () => {
    //     const container = document.createElement("div");
    //     container.innerHTML = "<p><br></p>";
    //     document.body.appendChild(container);
    //
    //     const range = new Range();
    //     range.setStart(container.querySelector("p") as Node, 0);
    //     range.setEnd(container.querySelector("p") as Node, 1);
    //
    //     (getRange as jest.Mock).mockReturnValue(range);
    //
    //     changeBlock(container, ["UL", "LI"]);
    //
    //     expect(container.innerHTML).toBe("<ul><li><br></li></ul>");
    // });

    test("Should change list with br to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero<br>first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "".length, getFirstChild(wrapper, "p"), "ze".length);

        expectHtml(wrapper.innerHTML, `
            <p>zero<br>first</p>
        `);
    });

    test("Should change list with strong to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">
                    <strong>zero</strong>
                    first
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getLastChild(wrapper, "p"), "".length, getLastChild(wrapper, "p"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <p>
                <strong>zero</strong>
                first
            </p>
        `);
    });

    test("Should change list with strong divided by br to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li><strong class="start">zero<br>first</strong></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p > strong"), "".length, getFirstChild(wrapper, "p > strong"), "ze".length);

        expectHtml(wrapper.innerHTML, `
            <p>
                <strong>zero<br>first</strong>
            </p>
        `);
    });

    test("Should change nested lists to two paragraphs", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ul>
                        <li class="end">first</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "ze".length, getFirstChild(wrapper, "p + p"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p>first</p>
        `);
    });

    test("Should change paragraph divided by br to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<br>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL", "LI"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "".length, getFirstChild(wrapper, "li"), "ze".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero<br>first</li>
            </ul>
        `);
    });

    test("Should change paragraph with strong tag to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero
                <strong>first</strong>
                second
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL", "LI"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "".length, getFirstChild(wrapper, "li"), "ze".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <strong>first</strong>
                    second
                </li>
            </ul>
        `);
    });

    test("Should change multiple lists to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["P"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "ze".length, getFirstChild(wrapper, "p:last-child"), "se".length);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p>first</p>
            <p>second</p>
        `);
    });

    test("Should change inner unordered list to ordered", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <ul>
                    <li class="start">first</li>
                </ul>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["OL"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "ol > li"), "fi".length, getFirstChild(wrapper, "ol > li"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ul>
        `);
    });

    test("Should change flat ordered list to unordered", () => {
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

        const cursorPosition = changeBlock(wrapper, ["OL"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "ol > li"), "fi".length, getFirstChild(wrapper, "ol > li"), "fi".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li>first</li>
            </ol>
        `);
    });

    test("Should change one of the nested ordered list to unordered", () => {
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
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "ul ul > li"), "se".length, getFirstChild(wrapper, "ul ul > li"), "se".length);

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

    test("Should change parent ordered list to unordered", () => {
        const wrapper = createWrapper(`
            <ol>
                <li class="start">zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "ul > li"), "ze".length, getFirstChild(wrapper, "ul > li"), "zer".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ul>
        `);
    });

    test("Should change paragraphs to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = changeBlock(wrapper, ["UL", "LI"]);
        expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "ze".length, getFirstChild(wrapper, "li + li"), "first".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `);
    });
});

describe("Wrap in tag with attributes", () => {
    test("Should create link", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = tag(wrapper, "A", Action.Wrap, {
            href: "https://www.briefeditor.io"
        });

        expectHtml(wrapper.innerHTML, `
            <p>ze<a href="https://www.briefeditor.io">ro</a></p>
            <p>
                <a href="https://www.briefeditor.io">first</a>
            </p>
        `);
        expectCursor(cursorPosition, getFirstChild(wrapper, "a"), "".length, getFirstChild(wrapper, "p + p a"), "first".length);
    });
});

describe("Remove block", () => {
    function cursorIn(wrapper: HTMLElement, selector: string) {
        const text = getFirstChild(wrapper, selector);
        return getCursorPositionFrom(text, 0, text, 0);
    }

    // The block the cursor falls back into is rebuilt, so it is named by its position here:
    // the marker classes the fixture is written with are not attributes normalization keeps.
    test("Should land at the end of the block before", () => {
        const wrapper = createWrapper(`<p class="before">before</p><p class="target">target</p><p class="after">after</p>`);

        const cursorPosition = removeBlock(wrapper, wrapper.querySelector(".target") as Element, cursorIn(wrapper, ".after"));

        expectHtml(wrapper.innerHTML, `<p>before</p><p class="after">after</p>`);
        const expectedContainer = getFirstChild(wrapper, "p");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("before".length);
        expect(cursorPosition.endOffset).toBe("before".length);
    });

    test("Should land at the start of the block after when there is none before", () => {
        const wrapper = createWrapper(`<p class="target">target</p><p class="after">after</p>`);

        const cursorPosition = removeBlock(wrapper, wrapper.querySelector(".target") as Element, cursorIn(wrapper, ".after"));

        expectHtml(wrapper.innerHTML, `<p>after</p>`);
        const expectedContainer = getFirstChild(wrapper, "p");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("Should join the lists the removed block stood between", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="target">target</p><ul><li>first</li></ul>`);

        const cursorPosition = removeBlock(wrapper, wrapper.querySelector(".target") as Element, cursorIn(wrapper, ".target"));

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
        const expectedContainer = getFirstChild(wrapper, "li");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("zero".length);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    test("Should keep lists of different types apart when the block between them goes", () => {
        const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="target">target</p><ol><li>first</li></ol>`);

        const cursorPosition = removeBlock(wrapper, wrapper.querySelector(".target") as Element, cursorIn(wrapper, ".target"));

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li></ul><ol><li>first</li></ol>`);
        const expectedContainer = getFirstChild(wrapper, "li");
        expect(cursorPosition.startContainer).toBe(expectedContainer);
        expect(cursorPosition.endContainer).toBe(expectedContainer);
        expect(cursorPosition.startOffset).toBe("zero".length);
        expect(cursorPosition.endOffset).toBe("zero".length);
    });

    test("Should hand back the given cursor when the block stood alone", () => {
        const wrapper = createWrapper(`<p class="target">target</p>`);
        const given = getCursorPositionFrom(wrapper, 0, wrapper, 0);

        const cursorPosition = removeBlock(wrapper, wrapper.querySelector(".target") as Element, given);

        expectHtml(wrapper.innerHTML, ``);
        expect(cursorPosition).toBe(given);
        expectCursor(cursorPosition, wrapper, 0);
    });
});
