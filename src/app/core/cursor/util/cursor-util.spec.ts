import {createWrapper, getFirstChild} from "@/core/shared/test-util";
import {getCursorPositionFromPoint} from "@/core/cursor/util/cursor-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Cursor position from a point", () => {
    // jsdom has no layout, so the method the browser resolves the point with does not exist here.
    afterEach(() => {
        delete (document as Partial<Document>).caretPositionFromPoint;
    });

    function mockCaretPosition(caretPosition: {offsetNode: Node, offset: number} | null) {
        document.caretPositionFromPoint = jest.fn().mockReturnValue(caretPosition);
    }

    test("Should collapse the resolved caret into a cursor position", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const text = getFirstChild(wrapper, ".start");
        mockCaretPosition({offsetNode: text, offset: "ze".length});

        const cursorPosition = getCursorPositionFromPoint(12, 24);

        expect(document.caretPositionFromPoint).toHaveBeenCalledWith(12, 24);
        expect(cursorPosition?.startContainer).toBe(text);
        expect(cursorPosition?.endContainer).toBe(text);
        expect(cursorPosition?.startOffset).toBe("ze".length);
        expect(cursorPosition?.endOffset).toBe("ze".length);
    });

    test("Should return nothing when the point resolves to no caret", () => {
        mockCaretPosition(null);

        expect(getCursorPositionFromPoint(12, 24)).toBeNull();
    });
});
