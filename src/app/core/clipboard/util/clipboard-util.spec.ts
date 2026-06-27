import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {pasteHtml} from "@/core/clipboard/util/clipboard-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Sanitize input", () => {
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

        const cursorPosition = getCursorPosition();
        pasteHtml(wrapper, `<h1>third</h1><p>fourth</p>`, cursorPosition);

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
    });
});