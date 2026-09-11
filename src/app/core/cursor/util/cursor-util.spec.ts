import {createWrapper, getFirstChild} from "@/core/shared/test-util";
import {
    findNodeAndOffset,
    getCursorAnchor,
    getCursorPositionFromPoint,
    getOffsetInElement,
    restoreCursorPosition
} from "@/core/cursor/util/cursor-util";
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {Carrier} from "@/core/carrier/carrier";

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

describe("Cursor as a place in the text", () => {
    afterEach(() => {
        Carrier.removeCarrier();
    });

    function anchor(wrapper: HTMLElement, startContainer: Node, startOffset: number,
                    endContainer: Node = startContainer, endOffset: number = startOffset) {
        return getCursorAnchor(wrapper,
            getCursorPositionFrom(startContainer, startOffset, endContainer, endOffset));
    }

    test("Should count only the text written before the point", () => {
        const wrapper = createWrapper(`<p class="start">zero<strong>first</strong>second</p>`);
        const block = wrapper.querySelector("p") as HTMLElement;

        expect(getOffsetInElement(block, getFirstChild(wrapper, ".start strong"), "fir".length))
            .toBe("zerofir".length);
    });

    test("Should measure nothing for a point outside the element", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const block = wrapper.querySelector(".start") as HTMLElement;

        expect(getOffsetInElement(block, getFirstChild(wrapper, ".end"), "fir".length)).toBe(0);
    });

    test("Should find the offset back across a tag boundary", () => {
        const wrapper = createWrapper(`<p class="start">z<strong>erofirst</strong>second</p>`);
        const block = wrapper.querySelector("p") as HTMLElement;
        const strongText = getFirstChild(wrapper, ".start strong");

        // The boundary answers to two offsets. The end of a selection belongs to the node before it, so it
        // stays inside the tag it was written in, and the start to the node after it.
        expect(findNodeAndOffset(block, "z".length)).toEqual({node: getFirstChild(wrapper, ".start"), offset: 1});
        expect(findNodeAndOffset(block, "z".length, false)).toEqual({node: strongText, offset: 0});
    });

    test("Should put the cursor on the br of a block holding no text", () => {
        const wrapper = createWrapper(`<p class="start"><br></p>`);
        const block = wrapper.querySelector("p") as HTMLElement;

        expect(findNodeAndOffset(block, 0)).toEqual({node: block.firstChild, offset: 0});
    });

    test("Should fall to the end of the text when the offset asks for more than there is", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const block = wrapper.querySelector("p") as HTMLElement;

        expect(findNodeAndOffset(block, "zerofirst".length))
            .toEqual({node: getFirstChild(wrapper, ".start"), offset: "zero".length});
    });

    test("Should restore the selection onto the block rebuilt in place", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "ze".length,
            getFirstChild(wrapper, ".start"), "zer".length);

        // What a command does: the block is rebuilt, so nothing the anchor was read from is left.
        wrapper.innerHTML = `<h1 class="start">ze<strong>r</strong>o</h1>`;
        const cursorPosition = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start strong"));
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, ".start strong"));
        expect(cursorPosition.endOffset).toBe("r".length);
    });

    test("Should collapse after what was written when the text changed", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "ze".length);

        wrapper.innerHTML = `<p class="start">zexro</p>`;
        const cursorPosition = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("zex".length);
        expect(cursorPosition.endOffset).toBe("zex".length);
    });

    test("Should stand the cursor in the carrier the wrap left behind", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "ze".length);

        // An empty text node holds no offset of its own to be found by, so it is named rather than searched.
        wrapper.innerHTML = `<p class="start">ze<strong></strong>ro</p>`;
        const carrier = document.createTextNode("");
        (wrapper.querySelector("strong") as HTMLElement).appendChild(carrier);
        Carrier.setCarrier(carrier);

        const cursorPosition = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(cursorPosition.startContainer).toBe(carrier);
        expect(cursorPosition.endContainer).toBe(carrier);
    });

    test("Should send a caret standing where a line was written onto the line it opens", () => {
        const wrapper = createWrapper(`<p class="start">zero<strong>first</strong></p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        // A br holds no text, so both sides of it answer to the same offset and only the br says which is
        // meant. Without it the caret belongs at the end of the text written before it.
        wrapper.innerHTML = `<p class="start">zero<br><strong>first</strong></p>`;
        const afterBreak = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(afterBreak.startContainer).toBe(getFirstChild(wrapper, ".start strong"));
        expect(afterBreak.startOffset).toBe("".length);

        wrapper.innerHTML = `<p class="start">zero<strong>first</strong></p>`;
        const noBreak = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(noBreak.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(noBreak.startOffset).toBe("zero".length);
    });

    test("Should walk on to the block that follows when the block was divided", () => {
        const wrapper = createWrapper(`<p class="start">zerofirst</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zerofir".length);

        // The block the offset was measured against no longer holds that much text: what followed the
        // cursor is standing in a block of its own now, and the offset left over once this block's text
        // is spent counts into it.
        wrapper.innerHTML = `<p class="start">zero</p><p>first</p>`;
        const cursorPosition = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p + p"));
        expect(cursorPosition.startOffset).toBe("fir".length);
    });

    test("Should walk on across every block the divided one was written into", () => {
        const wrapper = createWrapper(`<p class="start">zerofirstsecond</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zerofirstsec".length);

        // The place is three blocks along, so the text of each one in between is spent in turn.
        wrapper.innerHTML = `<p class="start">zero</p><p>first</p><p class="end">second</p>`;
        const cursorPosition = restoreCursorPosition(wrapper, cursorAnchor, getCursorPositionFrom(wrapper, 0, wrapper, 0));

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".end"));
        expect(cursorPosition.startOffset).toBe("sec".length);
    });

    test("Should keep a caret the command left on the br of an empty item", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><br></li></ul>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        // An item is measured against the whole list, and the empty line answers to the same offset as the
        // end of the item above it. Only the caret the command handed back can tell the two apart.
        const br = getFirstChild(wrapper, ".end");
        const given = getCursorPositionFrom(br, 0, br, 0);

        expect(restoreCursorPosition(wrapper, cursorAnchor, given)).toBe(given);
    });

    test("Should keep a caret the command left on the text node a deletion emptied", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><br></li></ul>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        const emptied = document.createTextNode("");
        (wrapper.querySelector(".end") as HTMLElement).prepend(emptied);
        const given = getCursorPositionFrom(emptied, 0, emptied, 0);

        expect(restoreCursorPosition(wrapper, cursorAnchor, given)).toBe(given);
    });

    test("Should resolve the anchor when the br the command left the caret on is gone", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li><br></li></ul>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        const br = wrapper.querySelector("br") as HTMLElement;
        const given = getCursorPositionFrom(br, 0, br, 0);
        br.remove();
        const cursorPosition = restoreCursorPosition(wrapper, cursorAnchor, given);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("zero".length);
    });

    test("Should hand back the given position when the block it was read in is gone", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "ze".length);

        wrapper.innerHTML = "";
        const given = getCursorPositionFrom(wrapper, 0, wrapper, 0);

        expect(restoreCursorPosition(wrapper, cursorAnchor, given)).toBe(given);
    });
});
