import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {mergePreviousBlock, mergeNextBlock, mergeBlocks} from "@/core/keyboard/util/keyboard-util";
import {getSelectionOffset} from "@/core/cursor/cursor";
import {CursorPosition} from "@/core/cursor/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Merge previous element", () => {
    test("When cursor is at the start should merge two elements", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <h1 class="start">first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergePreviousBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst <em>second</em></p>
        `);
    });

    test("When cursor is at the start should merge li with li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first <em>second</em></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergePreviousBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zerofirst <em>second</em></li>
            </ul>
        `);
    });

    test("When cursor is at the start should merge p and li", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <ul>
                <li class="start">first <em>second</em></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergePreviousBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst <em>second</em></p>
        `);
    });

    test("When cursor is at the start of nested list should merge li with li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first <em>second</em>
                    <ul>
                        <li class="start">third</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergePreviousBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first <em>second</em>third</li>
            </ul>
        `);
    });

    test("When cursor is at the start of the list containing nested list, merge li with li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first <em>second</em></li>
                <li class="start">third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergePreviousBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first <em>second</em>third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);
    });
});

describe("Merge next element", () => {
    test("When cursor is at the end should merge two elements", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <h1>first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergeNextBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zerofirst <em>second</em></p>
        `);
    });
});

describe("Merge first levels", () => {
    test("Should merge p and h1", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <h1 class="end">first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getSelectionOffset(wrapper) as CursorPosition;
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze rst <em>second</em></p>
        `);
    });
});