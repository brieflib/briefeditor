import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml, getFirstChild, getLastChild, getText} from "@/core/shared/test-util";
import {Merger} from "@/core/merger/type/merger-class";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import {normalizeNew, wrapInTagNew} from "@/core/normalize/util/normalize-util";
import {tag} from "@/core/command/util/command-util";
import {Action} from "@/core/command/type/command";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

beforeEach(() => {
    const range = new Range();
    (getRange as jest.Mock).mockReturnValue(range);
});

describe("Merger test", () => {
    test("Should merge extracted content back to dom", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zer<em>o</em>
                    <ul>
                        <li>first</li>
                        <li>second</li>
                        <li class="end">third</li>
                        <li>fourth</li>
                    </ul>
                </li>
                <li>fifth</li>
                <li>six</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition =  getCursorPosition();
        const merger = new Merger(wrapper, cursorPosition);
        const fragment = merger.extractContents();
        const wrapped = wrapInTagNew(fragment, "strong");
        const normalized = normalizeNew(wrapper, wrapped);
        merger.mergeIntoDom(normalized);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze<strong>r<em>o</em></strong>
                    <ul>
                        <li><strong>first</strong></li>
                        <li><strong>second</strong></li>
                        <li class="end"><strong>th</strong>ird</li>
                        <li>fourth</li>
                    </ul>
                </li>
                <li>fifth</li>
                <li>six</li>
            </ul>
        `);
    });

    test("Should merge extracted content ending in a top level item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zer<em>o</em>
                    <ul>
                        <li>first</li>
                        <li>second</li>
                    </ul>
                </li>
                <li class="end">fourth</li>
                <li>fifth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition =  getCursorPosition();
        const merger = new Merger(wrapper, cursorPosition);
        const fragment = merger.extractContents();
        const wrapped = wrapInTagNew(fragment, "strong");
        const normalized = normalizeNew(wrapper, wrapped);
        merger.mergeIntoDom(normalized);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze<strong>r<em>o</em></strong>
                    <ul>
                        <li><strong>first</strong></li>
                        <li><strong>second</strong></li>
                    </ul>
                </li>
                <li class="end"><strong>fo</strong>urth</li>
                <li>fifth</li>
            </ul>
        `);
    });

    test("Should merge content selected inside one text node", () => {
        const wrapper = createWrapper(`<p>abcdef</p>`);

        wrapSelectionInTag(wrapper, getText(wrapper, "abcdef"), "ab".length, getText(wrapper, "abcdef"), "abcd".length);

        expectHtml(wrapper.innerHTML, `<p>ab<strong>cd</strong>ef</p>`);
    });

    test("Should merge content selected across text nodes of one paragraph", () => {
        const wrapper = createWrapper(`<p>ab<em>cd</em>ef</p>`);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "ef"), "e".length);

        expectHtml(wrapper.innerHTML, `<p>a<strong>b<em>cd</em>e</strong>f</p>`);
    });

    test("Should merge content when the first block has content before the cursor", () => {
        const wrapper = createWrapper(`
            <p><em>xx</em>ab</p>
            <p>cd</p>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expectHtml(wrapper.innerHTML, `
            <p><em>xx</em>a<strong>b</strong></p>
            <p><strong>c</strong>d</p>
        `);
    });

    test("Should merge content with a whole paragraph between the selected ones", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <p>mid</p>
            <p>cd</p>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expectHtml(wrapper.innerHTML, `
            <p>a<strong>b</strong></p>
            <p><strong>mid</strong></p>
            <p><strong>c</strong>d</p>
        `);
    });

    test("Should merge content when the cursor starts at the end of a paragraph", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <p>cd</p>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "ab".length, getText(wrapper, "cd"), "c".length);

        expectHtml(wrapper.innerHTML, `
            <p>ab</p>
            <p><strong>c</strong>d</p>
        `);
    });

    test("Should merge content when the cursor ends at the start of a paragraph", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <p>cd</p>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "".length);

        expectHtml(wrapper.innerHTML, `
            <p>a<strong>b</strong></p>
            <p>cd</p>
        `);
    });

    test("Should not join a list the cursor ends at the start of", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
            </ul>
            <ul>
                <li>first</li>
            </ul>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "zero"), "z".length, getText(wrapper, "first"), "".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>z<strong>ero</strong></li>
            </ul>
            <ul>
                <li>first</li>
            </ul>
        `);
    });

    test("Should merge content selected from a paragraph into a list", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <ul>
                <li>cd</li>
                <li>ef</li>
            </ul>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expectHtml(wrapper.innerHTML, `
            <p>a<strong>b</strong></p>
            <ul>
                <li><strong>c</strong>d</li>
                <li>ef</li>
            </ul>
        `);
    });

    test("Should merge content selected from a list into a paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>ab</li>
                <li>cd</li>
            </ul>
            <p>ef</p>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "cd"), "c".length, getText(wrapper, "ef"), "e".length);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>ab</li>
                <li>c<strong>d</strong></li>
            </ul>
            <p><strong>e</strong>f</p>
        `);
    });

    test("Should merge content ending inside a nested inline tag", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <p><em>cd</em>ef</p>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expectHtml(wrapper.innerHTML, `
            <p>a<strong>b</strong></p>
            <p><strong><em>c</em></strong><em>d</em>ef</p>
        `);
    });

    test("Should merge content selected across table cells", () => {
        const wrapper = createWrapper(`
            <table>
                <tbody>
                    <tr>
                        <td>ab</td>
                        <td>cd</td>
                    </tr>
                </tbody>
            </table>
        `);

        wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expectHtml(wrapper.innerHTML, `
            <table>
                <tbody>
                    <tr>
                        <td>a<strong>b</strong></td>
                        <td><strong>c</strong>d</td>
                    </tr>
                </tbody>
            </table>
        `);
    });

    test("Should return the first and the last inserted nodes", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <p>cd</p>
        `);

        const {first, last} = wrapSelectionInTag(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expect(first).toBe(wrapper.querySelector("p strong"));
        expect(last).toBe(wrapper.querySelector("p + p strong"));
    });

    test("Should return no inserted nodes when the cursor is collapsed", () => {
        const wrapper = createWrapper(`<p>abcd</p>`);

        const {first, last} = wrapSelectionInTag(wrapper, getText(wrapper, "abcd"), "ab".length, getText(wrapper, "abcd"), "ab".length);

        expect(first).toBeUndefined();
        expect(last).toBeUndefined();
    });

    test("Should leave dom as is when the cursor is collapsed", () => {
        const wrapper = createWrapper(`<p>abcd</p>`);

        wrapSelectionInTag(wrapper, getText(wrapper, "abcd"), "ab".length, getText(wrapper, "abcd"), "ab".length);

        expectHtml(wrapper.innerHTML, `<p>abcd</p>`);
    });
});

/** Wraps the content between the given points in strong the way a tag command does: extract, wrap, normalize and merge back. */
function wrapSelectionInTag(wrapper: HTMLElement, startContainer: Node, startOffset: number, endContainer: Node, endOffset: number, tag = "strong") {
    const range = new Range();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);
    (getRange as jest.Mock).mockReturnValue(range);

    const merger = new Merger(wrapper, getCursorPosition());
    const fragment = merger.extractContents();
    const wrapped = wrapInTagNew(fragment, tag);
    const normalized = normalizeNew(wrapper, wrapped);
    return merger.mergeIntoDom(normalized);
}
