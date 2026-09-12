import {createWrapper, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
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

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "first".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is at the end of the paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<em>first</em>second</p>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "second".length);
        range.setEnd(getLastChild(wrapper, ".start"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is not at the end of the paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero<em class="start">first</em>second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "first".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const selected = new Range();
        selected.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        selected.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(selected);

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

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "first".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is at empty element", () => {
        const wrapper = createWrapper(`
            <p class="start"><br></p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as Node, "".length);
        range.setEnd(wrapper.querySelector(".start") as Node, "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtEnd = isCursorAtEndOfBlock(wrapper);

        expect(isAtEnd).toBe(true);
    });

    test("Cursor is at the start of em, but not at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero<em class="start">first</em></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtStart = isCursorAtStartOfBlock(wrapper);

        expect(isAtStart).toBe(false);
    });

    test("Cursor is at the start of em and at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p><em class="start">zero</em>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtStart = isCursorAtStartOfBlock(wrapper);

        expect(isAtStart).toBe(true);
    });

    test("Cursor is at the start of paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<em>first</em></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isAtStart = isCursorAtStartOfBlock(wrapper);

        expect(isAtStart).toBe(true);
    });

    test("Cursor does not intersect paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<em>first</em></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isIntersect = isCursorIntersectBlocks(wrapper);

        expect(isIntersect).toBe(false);
    });

    test("Cursor intersects paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isIntersect = isCursorIntersectBlocks(wrapper);

        expect(isIntersect).toBe(true);
    });
});