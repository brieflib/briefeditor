import normalize, {appendTags, clearEmptyElements, removeTags, replaceTags} from "@/core/normalize/normalize";
import {createWrapper, expectHtml, getFirstChild, getLastChild, testNormalize} from "@/core/shared/test-util";
import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";
import {getRange} from "@/core/shared/range-util";

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

    test("Should delete paragraph and strong duplicates", () => {
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
            <div>zero
                <strong>first second</strong>
            </div>
        `);
    });

    test("Should preserve href property", () => {
        const wrapper = document.createElement("div");
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>zero<a href=\"http://www.briefeditor.com\">first</a><a href=\"http://briefeditor.com\">second</a>third<em>fourth</em></strong>";
        wrapper.appendChild(toNormalize);

        normalize(toNormalize, toNormalize);
        expect(wrapper.innerHTML).toBe("<strong>zero</strong><a href=\"http://www.briefeditor.com\"><strong>first</strong></a><a href=\"http://briefeditor.com\"><strong>second</strong></a><strong>third<em>fourth</em></strong>");
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

        const div = wrapper.querySelector(".start") as HTMLElement;
        normalize(wrapper, div);

        expectHtml(wrapper.innerHTML, `
            <div class="start">zero</div>
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

        const toRemove = getLastChild(wrapper, ".start") as HTMLElement;
        removeTags(wrapper, toRemove, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <strong>
                <u class="start">
                    <i>zero</i>
                </u>
            </strong>
            <u class="start">first</u>
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

        const toRemove = wrapper.querySelector(".start");
        removeTags(wrapper, toRemove as HTMLElement, ["STRONG"], getCursorPosition());

        expectHtml(wrapper.innerHTML, `
            <strong>
                <u>
                    <i>zero</i>
                </u>
            </strong>
            <div class="start">
                <u><span>first</span>second</u>
            </div>
            third
        `);
    });
});

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

describe("Should append tags", () => {
    test("Should append list tags", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong>
            </p>
        `);

        const toAppend = wrapper.querySelector(".start") as HTMLElement;
        appendTags(wrapper, toAppend, ["UL", "LI"]);

        expectHtml(wrapper.innerHTML, `
            <p>
                <ul>
                    <li>
                        <strong class="start">zero</strong>
                    </li>
                </ul>
            </p>
        `);
    });
});

describe("Clear empty elements", () => {
    test("Cursor position should point to actual elements", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = clearEmptyElements(wrapper, getCursorPosition());
        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, ".start"));
    });
});