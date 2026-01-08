import {createWrapper, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {isCursorAtEndOfBlock} from "@/core/cursor/cursor";

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
});