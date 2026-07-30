import {
    appendTag,
    normalize,
    removeAndNormalize,
    removeTags,
    replaceTags
} from "@/core/normalize/normalize";
import {createWrapper, expectHtml, getFirstChild, testNormalize} from "@/core/shared/test-util";
import {CursorPosition, getCursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {getRange} from "@/core/shared/range-util";
import {Carrier} from "@/core/carrier/carrier";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

beforeEach(() => {
    const range = new Range();
    (getRange as jest.Mock).mockReturnValue(range);
});

describe("Should normalize tags", () => {
    test("Should sort tags by priority", () => {
        testNormalize(`
            <strong>zero</strong>
            <em><strong>first</strong>second</em>
            third
        `,
            `
            <strong>zero<em>first</em></strong>
            <em>second</em>
            third
        `);
    });

    test("Should collapse similar tags", () => {
        testNormalize(`
            <strong>zero </strong>
            <strong>first</strong>
        `,
            `
            <strong>zero first</strong>
        `);
    });

    test("Should be the same", () => {
        testNormalize(`
            <strong>zero</strong>
            <span>first</span>
            <strong>second</strong>
        `,
            `
            <strong>zero</strong>
            <span>first</span>
            <strong>second</strong>
        `);
    });

    test("Should honor double br", () => {
        testNormalize(`
            <strong>zero</strong>
            <br>
            <br>
            <strong>first</strong>
        `,
            `
            <strong>zero</strong>
            <br>
            <br>
            <strong>first</strong>
        `);
    });

    test("Should honor br", () => {
        testNormalize(`
            <strong>zero</strong>
            <br>
            <strong>first</strong>
        `,
            `
            <strong>zero</strong>
            <br>
            <strong>first</strong>
        `);
    });

    test("Should delete duplicates", () => {
        testNormalize(`
            <strong>zero
                <strong>
                    first
                    <strong>
                        <em>second</em>
                    </strong>
                </strong>
            </strong>`,
            `
            <strong>zero first
                <em>second</em>
            </strong>
        `);
    });

    test("Should delete div and strong duplicates", () => {
        testNormalize(`
            <div>zero
                <strong>
                    <div>first
                        <strong>
                            <div>second</div>
                        </strong>
                    </div>
                </strong>
            </div>`,
            `
            <div>zero <strong>first second</strong></div>
        `);
    });

    test("Should preserve href property", () => {
        const wrapper = document.createElement("div");
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>zero<a href=\"https://www.briefeditor.io\">first</a><a href=\"https://briefeditor.io\">second</a>third<em>fourth</em></strong>";
        wrapper.appendChild(toNormalize);

        const range = new Range();
        range.setStart(wrapper.firstChild as HTMLElement, "".length);
        range.setEnd(wrapper.lastChild as HTMLElement, "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        normalize(wrapper, getCursorPosition());
        expect((wrapper.firstChild as HTMLElement).innerHTML).toBe("<strong>zero</strong><a href=\"https://www.briefeditor.io\"><strong>first</strong></a><a href=\"https://briefeditor.io\"><strong>second</strong></a><strong>third<em>fourth</em></strong>");
    });

    test("Should preserve nested ordered list", () => {
        testNormalize(`
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <strong>second </strong>
                            <strong>third</strong>
                        </li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>`,
            `
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <strong>second third</strong>
                        </li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Should merge multiple ul", () => {
        testNormalize(`
            <ul>
                <li>zero</li>
            </ul><ul>
                <li>first</li>
            </ul>`,
            `
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `);
    });

    test("Should preserve table", () => {
        const table = `
            <table>
              <thead>
                <tr>
                  <th>zero</th>
                  <th>first</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>second</td>
                  <td>third <strong>fourth</strong> fifth</td>
                </tr>
                <tr>
                  <td>six</td>
                  <td>seventh</td>
                </tr>
              </tbody>
            </table>
        `;
        testNormalize(table, table);
    });

    test("Should remove empty tags", () => {
        const wrapper = createWrapper(`
            <div class="start">zero<ul><li></li></ul></div>
        `);


        const range = new Range();
        range.setStart(wrapper.firstChild as HTMLElement, "".length);
        range.setEnd(wrapper.lastChild as HTMLElement, "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        normalize(wrapper, getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <div>zero</div>
        `);
    });

    test("Should preserve paragraphs duplication", () => {
        testNormalize(`
            <p>
                <strong>zero</strong>
                first
            </p>
            <p>second</p>`,
            `
            <p>
                <strong>zero</strong>
                first
            </p>
            <p>second</p>
        `);
    });
});

describe("Should remove tags", () => {
    test("Should remove strong tag from text", () => {
        const wrapper = createWrapper(`
            <strong>
                <u class="start"><i>zero</i>first</u>
            </strong>
            second
        `);


        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start i"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start i"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        removeTags(wrapper, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <u>
                <i>zero</i>
            </u>
            <strong>
                <u>first</u>
            </strong>
            second
        `);
    });

    test("Should remove strong tag from div", () => {
        const wrapper = createWrapper(`
            <strong>
                <u>
                    <i>zero</i>
                    <div class="start">
                        <span>first</span>
                        <div>second</div>
                    </div>
                </u>
            </strong>
            third
        `);


        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start span"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start div"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        removeTags(wrapper, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <strong>
                <u>
                    <i>zero</i>
                </u>
            </strong>
            <div>
                <u><span>first</span>second</u>
            </div>
            third
        `);
    });
});

describe("Should append tags", () => {
    test("Should merge sibling strong", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        appendTag(wrapper, getCursorPosition(), "STRONG");

        expectHtml(wrapper.innerHTML, `
            <p><strong>zerofirst</strong></p>
        `);
    });
});

describe("Should leave an empty element for a collapsed cursor", () => {
    test("Should split the tag and leave the cursor between the halves", () => {
        const wrapper = createWrapper(`<p class="start"><strong>bold</strong></p>`);
        collapseRangeAt(getFirstChild(wrapper, ".start strong"), "bo".length);

        const cursorPosition = removeTags(wrapper, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `<p><strong>bo</strong><strong>ld</strong></p>`);
        expectCarrierIn(cursorPosition, "P");
    });

    test("Should leave the empty element after the tag", () => {
        const wrapper = createWrapper(`<p class="start"><strong>bold</strong></p>`);
        collapseRangeAt(getFirstChild(wrapper, ".start strong"), "bold".length);

        const cursorPosition = removeTags(wrapper, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `<p><strong>bold</strong></p>`);
        expectCarrierIn(cursorPosition, "P");
        expect(cursorPosition.startContainer.previousSibling?.nodeName).toBe("STRONG");
    });

    test("Should leave the empty element before the tag", () => {
        const wrapper = createWrapper(`<p class="start"><strong>bold</strong></p>`);
        collapseRangeAt(getFirstChild(wrapper, ".start strong"), "".length);

        const cursorPosition = removeTags(wrapper, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `<p><strong>bold</strong></p>`);
        expectCarrierIn(cursorPosition, "P");
        expect(cursorPosition.startContainer.nextSibling?.nodeName).toBe("STRONG");
    });

    test("Should keep the tags that were not removed", () => {
        const wrapper = createWrapper(`<p class="start"><em><strong>zero</strong></em></p>`);
        collapseRangeAt(getFirstChild(wrapper, ".start strong"), "zero".length);

        const cursorPosition = removeTags(wrapper, ["STRONG"], getCursorPosition());

        // Sorted to <strong><em> by tag hierarchy, and the empty element keeps the em it was left in.
        expectHtml(wrapper.innerHTML, `<p><strong><em>zero</em></strong><em></em></p>`);
        expectCarrierIn(cursorPosition, "EM");
    });

    test("Should leave the empty element inside the appended tag", () => {
        const wrapper = createWrapper(`<p class="start">plain</p>`);
        collapseRangeAt(getFirstChild(wrapper, ".start"), "pl".length);

        const cursorPosition = appendTag(wrapper, getCursorPosition(), "STRONG");

        expectHtml(wrapper.innerHTML, `<p>pl<strong></strong>ain</p>`);
        expectCarrierIn(cursorPosition, "STRONG");
    });

    test("Should collapse back to plain text when the same tag is toggled twice", () => {
        const wrapper = createWrapper(`<p class="start">plain</p>`);
        collapseRangeAt(getFirstChild(wrapper, ".start"), "pl".length);

        const appended = appendTag(wrapper, getCursorPosition(), "STRONG");
        const cursorPosition = removeTags(wrapper, ["STRONG"], atCursor(appended));

        expectHtml(wrapper.innerHTML, `<p>plain</p>`);
        expect(cursorPosition.startContainer.textContent).toBe("plain");
        expect(cursorPosition.startOffset).toBe("pl".length);
    });
});

function collapseRangeAt(node: Node, offset: number) {
    Carrier.setCursorCollapsed(true);

    const range = new Range();
    range.setStart(node, offset);
    range.setEnd(node, offset);
    (getRange as jest.Mock).mockReturnValue(range);

    return getCursorPosition();
}

// The cursor position a command returns carries the right container and offset, but its range was
// reused as scratch space by replaceElement. Rebuild it the way setCursorPosition does before
// handing it to the next command.
function atCursor(cursorPosition: CursorPosition) {
    return getCursorPositionFrom(
        cursorPosition.startContainer, cursorPosition.startOffset,
        cursorPosition.endContainer, cursorPosition.endOffset);
}

function expectCarrierIn(cursorPosition: CursorPosition, parentName: string) {
    expect(cursorPosition.startContainer.nodeType).toBe(Node.TEXT_NODE);
    expect(cursorPosition.startContainer.textContent).toBe("");
    expect(cursorPosition.startOffset).toBe(0);
    expect(cursorPosition.startContainer.parentElement?.nodeName).toBe(parentName);
}

describe("Should replace tags", () => {
    test("Should replace div tag with list", () => {
        const wrapper = createWrapper(`
            <strong>
                <u>
                    <i>zero</i>
                    <div class="start">
                        <span>first</span>
                        <p>second</p>
                    </div>
                </u>
            </strong>
            third
        `);

        const toReplace = wrapper.querySelector(".start") as HTMLElement;
        replaceTags(wrapper, toReplace, ["DIV"], ["UL", "LI"]);

        expectHtml(wrapper.innerHTML, `
            <strong>
                <u>
                    <i>zero</i>
                </u>
            </strong>
            <ul>
                <li>
                    <strong>
                        <u>
                            <span>first</span>
                        </u>
                    </strong>
                    <p>
                        <strong>
                            <u>second</u>
                        </strong>
                    </p>
                </li>
            </ul>
            third
        `);
    });
});

describe("Should move first level elements out", () => {
    test("Should move h1 out of p 1", () => {
        const wrapper = createWrapper(`
            <p>zero<strong>second</strong></p>
        `);

        const h1 = document.createElement("H1");
        h1.innerHTML = "first";
        const p = document.querySelector("P") as HTMLElement;
        p.firstChild?.after(h1);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "h1"), "".length);
        range.setEnd(getFirstChild(wrapper, "h1"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        removeAndNormalize(wrapper, p, [], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
             <p>zero</p>
             <h1>first</h1>
             <p><strong>second</strong></p>
        `);
    });

    test("Should move h1 and h2 out of p", () => {
        const wrapper = createWrapper(`
            <p>zero<strong>third</strong></p>
        `);

        const h1 = document.createElement("H1");
        h1.innerHTML = "first<h2><strong><em>se</em>co</strong>nd</h2>";
        const p = document.querySelector("P") as HTMLElement;
        p.firstChild?.after(h1);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "h1"), "".length);
        range.setEnd(getFirstChild(wrapper, "h1"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        removeAndNormalize(wrapper, p, [], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
             <p>zero</p>
             <h1>first</h1>
             <h2><strong><em>se</em>co</strong>nd</h2>
             <p><strong>third</strong></p>
        `);
    });

    test("Should move h1 and h2 out of list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">ze<h1>first<h2><strong><em>se</em>co</strong>nd</h2></h1>ro</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const ul = document.querySelector("UL") as HTMLElement;
        removeAndNormalize(wrapper, ul, [], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
             <ul>
                <li>ze</li>
             </ul>
             <h1>first</h1>
             <h2><strong><em>se</em>co</strong>nd</h2>
             <ul>
                <li>ro</li>
             </ul>
        `);
    });
});