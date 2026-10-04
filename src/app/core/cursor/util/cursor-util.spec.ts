import {createWrapper, expectCursor, getFirstChild, selectRange} from "@/core/shared/test-util";
import {
    CursorAnchor,
    findNodeAndOffset,
    getCursorAnchor,
    getCursorPositionFromPoint,
    getOffsetInElement, resolveCursorAnchor
} from "@/core/cursor/util/cursor-util";
import {getCursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
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
        Carrier.getInstance().removeCarrier();
    });

    function anchor(wrapper: HTMLElement, startContainer: Node, startOffset: number,
                    endContainer: Node = startContainer, endOffset: number = startOffset) {
        return getCursorAnchor(wrapper,
            getCursorPositionFrom(startContainer, startOffset, endContainer, endOffset));
    }

    function getAnchorCursorPosition(wrapper: HTMLElement, cursorAnchor: CursorAnchor) {
        return resolveCursorAnchor(wrapper, cursorAnchor);
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

        // The boundary answers to two offsets, and the point is found on the node before it.
        expect(findNodeAndOffset(block, "z".length)).toEqual({node: getFirstChild(wrapper, ".start"), offset: 1});
    });

    test("Should resolve the end standing at the start of the next block into that block", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "".length,
            getFirstChild(wrapper, ".end"), "".length);

        expect(cursorAnchor.isCursorEndInsideNextBlock).toBe(true);

        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);
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

    // A select-all leaves both ends on the editable element rather than on text.
    test("Should anchor a selection standing on the editable element itself", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, wrapper, 0, wrapper, wrapper.childNodes.length);

        // With the block it was read on removed, the editor has no text left to find the anchor in.
        wrapper.querySelector(".start")?.remove();
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expectCursor(cursorPosition, wrapper, 0);
    });

    test("Should restore the selection onto the block rebuilt in place", () => {
        const wrapper = createWrapper(`<p>start</p><p class="start">zero</p><p>end</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length,
            getFirstChild(wrapper, ".start"), "zer".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        // What a command does: the block is rebuilt, so nothing the anchor was read from is left, and the
        // position it hands back names nodes no longer in the document.
        (wrapper.childNodes[1] as HTMLElement).outerHTML = `<h1 class="start">ze<strong>r</strong>o</h1>`;
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start strong"));
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, ".start strong"));
        expect(cursorPosition.endOffset).toBe("r".length);
    });

    test("Should collapse after what was written when the text changed", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "ze".length);

        wrapper.innerHTML = `<p class="start">zexro</p>`;
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("ze".length);
        expect(cursorPosition.endOffset).toBe("ze".length);
        expect(cursorPosition.endContainer).toBe(cursorPosition.startContainer);
    });

    test("Should stand the cursor in the carrier", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);

        const carrier = document.createTextNode("");
        const strong = document.createElement("strong");
        strong.appendChild(carrier);
        getCursorPosition().range.insertNode(strong);
        Carrier.getInstance().setCarrier(carrier);

        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start strong"), "".length);
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(carrier);
        expect(cursorPosition.endContainer).toBe(carrier);
        expect(cursorPosition.startOffset).toBe(0);
        expect(cursorPosition.endOffset).toBe(0);
    });

    test("Should send a caret standing where a line was written onto the line it opens", () => {
        const wrapper = createWrapper(`<p class="start">zero<strong>first</strong></p>`);
        let given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "zero".length,
            getFirstChild(wrapper, ".start"), "zero".length);
        let cursorAnchor = getCursorAnchor(wrapper, given);

        // A br holds no text, so both sides of it answer to the same offset and only the br says which is
        // meant. Without it the caret belongs at the end of the text written before it.
        wrapper.innerHTML = `<p class="start">zero<br><strong>first</strong></p>`;
        const afterBreak = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(afterBreak.startContainer).toBe(getFirstChild(wrapper, ".start strong"));
        expect(afterBreak.startOffset).toBe("".length);
        expect(afterBreak.endContainer).toBe(afterBreak.startContainer);
        expect(afterBreak.endOffset).toBe(afterBreak.startOffset);

        wrapper.innerHTML = `<p class="start">zero<strong>first</strong></p>`;
        given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "zero".length,
            getFirstChild(wrapper, ".start"), "zero".length);
        cursorAnchor = getCursorAnchor(wrapper, given);
        const noBreak = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(noBreak.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(noBreak.startOffset).toBe("zero".length);
        expect(noBreak.endContainer).toBe(noBreak.startContainer);
        expect(noBreak.endOffset).toBe(noBreak.startOffset);
    });

    test("Should walk on to the block that follows when the block was divided", () => {
        const wrapper = createWrapper(`<p class="start">zerofirst</p>`);
        const given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "zerofir".length,
            getFirstChild(wrapper, ".start"), "zerofir".length);
        const cursorAnchor = getCursorAnchor(wrapper, given);

        // The block the offset was measured against no longer holds that much text: what followed the
        // cursor is standing in a block of its own now, and the offset left over once this block's text
        // is spent counts into it.
        wrapper.innerHTML = `<p class="start">zero</p><p>first</p>`;
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, "p + p"));
        expect(cursorPosition.startOffset).toBe("fir".length);
        expect(cursorPosition.endContainer).toBe(cursorPosition.startContainer);
        expect(cursorPosition.endOffset).toBe(cursorPosition.startOffset);
    });

    test("Should walk on across every block the divided one was written into", () => {
        const wrapper = createWrapper(`<p class="start">zerofirstsecond</p>`);
        const given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "zerofirstsec".length,
            getFirstChild(wrapper, ".start"), "zerofirstsec".length);
        const cursorAnchor = getCursorAnchor(wrapper, given);

        // The place is three blocks along, so the text of each one in between is spent in turn.
        wrapper.innerHTML = `<p class="start">zero</p><p>first</p><p class="end">second</p>`;
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".end"));
        expect(cursorPosition.startOffset).toBe("sec".length);
        expect(cursorPosition.endContainer).toBe(cursorPosition.startContainer);
        expect(cursorPosition.endOffset).toBe(cursorPosition.startOffset);
    });

    test("Should leave the caret after the text written over a line selected up to the start of the next block", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        // A triple click selects a line from its start to the start of the block below it.
        const given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "".length,
            wrapper.querySelector(".end") as HTMLElement, 0);
        const cursorAnchor = getCursorAnchor(wrapper, given);

        // What typing over the line does: the line is written over, and the block below keeps to itself. The
        // end was measured at nothing into that block, and the caret does not belong there but after what
        // was written in the block the start was read in.
        wrapper.innerHTML = `<p class="start">k</p><p class="end">first</p>`;
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("".length);
        expect(cursorPosition.endContainer).toBe(getFirstChild(wrapper, ".end"));
        expect(cursorPosition.endOffset).toBe("".length);
    });

    test("Should leave the caret after the text written over a selection reaching into the next block", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p><p>second</p>`);
        const given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "ze".length,
            getFirstChild(wrapper, ".end"), "fi".length);
        const cursorAnchor = getCursorAnchor(wrapper, given);

        // The two blocks are joined around what was written, so the end of the selection is that much text
        // along the block the start was read in - not two characters into whatever block stands second now.
        wrapper.innerHTML = `<p class="start">zekrst</p><p>second</p>`;
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("zek".length);
        expect(cursorPosition.endContainer).toBe(cursorPosition.startContainer);
        expect(cursorPosition.endOffset).toBe(cursorPosition.startOffset);
    });

    test("Should keep a caret the command left on the br of an empty item", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><br></li></ul>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        // An item is measured against the whole list, and the empty line answers to the same offset as the
        // end of the item above it. Only the caret the command handed back can tell the two apart.
        const br = getFirstChild(wrapper, ".end");
        const given = getCursorPositionFrom(br, 0, br, 0);

        expect(getAnchorCursorPosition(wrapper, cursorAnchor)).toBe(given);
    });

    test("Should keep a caret the command left on the text node a deletion emptied", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><br></li></ul>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        const emptied = document.createTextNode("");
        (wrapper.querySelector(".end") as HTMLElement).prepend(emptied);
        const given = getCursorPositionFrom(emptied, 0, emptied, 0);

        expect(getAnchorCursorPosition(wrapper, cursorAnchor)).toBe(given);
    });

    // A rebuild writes no text, so the position the command hands back is the resolved one, and it is the
    // only one that can name the br an end of the selection stands on.
    test("Should keep a selection the command handed back on nodes still in the document when no text was written", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><br></li></ul>`);
        const given = getCursorPositionFrom(getFirstChild(wrapper, ".start"), "ze".length,
            getFirstChild(wrapper, ".end"), 0);
        const cursorAnchor = getCursorAnchor(wrapper, given);

        expect(getAnchorCursorPosition(wrapper, cursorAnchor)).toBe(given);
    });

    test("Should resolve the anchor when the br the command left the caret on is gone", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li><br></li></ul>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "zero".length);

        const br = wrapper.querySelector("br") as HTMLElement;
        br.remove();
        const cursorPosition = getAnchorCursorPosition(wrapper, cursorAnchor);

        expect(cursorPosition.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(cursorPosition.startOffset).toBe("zero".length);
        expect(cursorPosition.endContainer).toBe(cursorPosition.startContainer);
        expect(cursorPosition.endOffset).toBe(cursorPosition.startOffset);
    });

    test("Should hand back the given position when the block it was read in is gone", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const cursorAnchor = anchor(wrapper, getFirstChild(wrapper, ".start"), "ze".length);

        wrapper.innerHTML = "";
        const given = getCursorPositionFrom(wrapper, 0, wrapper, 0);

        expect(getAnchorCursorPosition(wrapper, cursorAnchor)).toBe(given);
    });

    test("Should keep a caret at the start of a nested item in one place after the list is rebuilt", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li class="start">second</li>
                    </ol>
                </li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);
        const cursorAnchor = getCursorAnchor(wrapper) as CursorAnchor;

        wrapper.innerHTML = `<ul><li>zero<ol><li>first</li></ol><ul><li class="start">second</li></ul></li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    test("Should keep the end at the start of its line after two paragraphs are rebuilt into one list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);
        const cursorAnchor = getCursorAnchor(wrapper) as CursorAnchor;

        wrapper.innerHTML = `<ul><li class="start">zero</li><li class="end">first</li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);
    });
});