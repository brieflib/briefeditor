import {createWrapper, getFirstChild, getLastChild, selectRange} from "@/core/shared/test-util";
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock, isCursorIntersectBlocks} from "@/core/cursor/cursor";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Cursor location", () => {
    test("Cursor is at the end of em and paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero<em class="start">first</em></p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "first".length, getFirstChild(wrapper, ".start"), "first".length);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is at the end of the paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<em>first</em>second</p>
        `);

        selectRange(getLastChild(wrapper, ".start"), "second".length, getLastChild(wrapper, ".start"), "second".length);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is not at the end of the paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero<em class="start">first</em>second</p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "first".length, getFirstChild(wrapper, ".start"), "first".length);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(false);
    });

    // A command asks this in the middle of its own work, where the live selection still stands on the line
    // the writer left it on and the cursor handed in stands on another.
    test("Cursor is at the end of the block it is handed in on rather than of the selected one", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);

        const container = getFirstChild(wrapper, ".end");
        const cursorPosition = getCursorPositionFrom(container, "first".length, container, "first".length);

        expect(isCursorAtEndOfBlock(wrapper, cursorPosition)).toBe(true);
    });

    test("Cursor is at the end of the li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>
                    zero <em class="start">first</em>
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "first".length, getFirstChild(wrapper, ".start"), "first".length);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is at empty element", () => {
        const wrapper = createWrapper(`
            <p class="start"><br></p>
        `);

        selectRange(wrapper.querySelector(".start") as Node, "".length, wrapper.querySelector(".start") as Node, "".length);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is at the start of em, but not at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero<em class="start">first</em></p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);

        const isAtStart = isCursorAtStartOfBlock(wrapper);

        expect(isAtStart).toBe(false);
    });

    test("Cursor is at the start of em and at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p><em class="start">zero</em>first</p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);

        const isAtStart = isCursorAtStartOfBlock(wrapper);

        expect(isAtStart).toBe(true);
    });

    test("Cursor is at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<em>first</em></p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);

        const isAtStart = isCursorAtStartOfBlock(wrapper);

        expect(isAtStart).toBe(true);
    });

    test("Cursor does not intersect paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<em>first</em></p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);

        const isIntersect = isCursorIntersectBlocks(wrapper);

        expect(isIntersect).toBe(false);
    });

    test("Cursor intersects paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "zero".length, getFirstChild(wrapper, ".end"), "".length);

        const isIntersect = isCursorIntersectBlocks(wrapper);

        expect(isIntersect).toBe(true);
    });
});