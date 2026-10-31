import {
    createWrapper,
    expectCursor,
    getFirstChild,
    getLastChild, keydown,
    querySelector,
    selectRange
} from "@/core/shared/test-util";
import {
    findNodeAndOffset,
    getCursorAnchor,
    getCursorPositionFromPoint, getNextCharacterAnchor,
    getOffsetInElement,
    resolveCursorAnchor
} from "@/core/cursor/util/cursor-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import {Carrier} from "@/core/carrier/carrier";
import {Action} from "@/core/command/type/command";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Cursor position from a point", () => {
    // jsdom has no layout, so the method the browser resolves the point with does not exist here.
    afterEach(() => {
        delete (document as Partial<Document>).caretPositionFromPoint;
    });

    function mockCaretPosition(caretPosition: { offsetNode: Node, offset: number } | null) {
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

    test("Should count only the text written before the point", () => {
        const wrapper = createWrapper(`<p class="start">zero<strong>first</strong>second</p>`);
        const block = wrapper.querySelector("p") as HTMLElement;

        expect(getOffsetInElement(getFirstChild(wrapper, ".start strong") as HTMLElement, block, "fir".length))
            .toBe("zerofir".length);
    });

    test("Should measure nothing for a point outside the element", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const block = wrapper.querySelector(".start") as HTMLElement;

        expect(getOffsetInElement(getFirstChild(wrapper, ".end"), block, "fir".length)).toBe(0);
    });

    test("Should find the offset back across a tag boundary", () => {
        const wrapper = createWrapper(`<p class="start">z<strong>erofirst</strong>second</p>`);
        const block = wrapper.querySelector("p") as HTMLElement;

        // The boundary answers to two offsets, and the point is found on the node before it.
        expect(findNodeAndOffset(block, "z".length)).toEqual({node: getFirstChild(wrapper, ".start"), offset: 1});
    });

    test("Should resolve the end standing at the start of the next block into that block", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);

        const cursorAnchor = getCursorAnchor(wrapper);
        expect(cursorAnchor.endIsAfter).toBe(true);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);
    });

    test("Should read a caret at the start of the second item as standing inside the next block", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">first</li></ul>`);
        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        expect(cursorAnchor.startIsAfter).toBe(true);
    });

    test("Should read a caret at the end of the first item as standing in its own block", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li>first</li></ul>`);
        selectRange(getFirstChild(wrapper, ".start"), "zero".length, getFirstChild(wrapper, ".start"), "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        expect(cursorAnchor.startIsAfter).toBe(false);
    });

    // Both carets count to the same offset; only the side read with the anchor puts them on different lines.
    test("Should keep a caret at the end of the first item on that item", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li>first</li></ul>`);
        selectRange(getFirstChild(wrapper, ".start"), "zero".length, getFirstChild(wrapper, ".start"), "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
    });

    test("Should keep a caret at the start of the second item on that item", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">first</li></ul>`);
        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    // A selection start goes into the node after it, but a br is an empty line, not the end of a node.
    test("Should keep a selection start on the br of an empty first paragraph", () => {
        const wrapper = createWrapper(`<p class="start"><br></p><p class="end">first</p>`);
        selectRange(getFirstChild(wrapper, ".start"), 0, getFirstChild(wrapper, ".end"), "first".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), 0, getFirstChild(wrapper, ".end"), "first".length);
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
        selectRange(wrapper, 0, wrapper, wrapper.childNodes.length);
        const cursorAnchor = getCursorAnchor(wrapper);

        // With the block it was read on removed, the editor has no text left to find the anchor in.
        wrapper.querySelector(".start")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, wrapper, 0);
    });

    test("Should restore the selection onto the block", () => {
        const wrapper = createWrapper(`<p>start</p><p class="start">zero</p><p>end</p>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "ze".length, zero, "zer".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), {action: Action.Tag, tag: "STRONG"});

        // What a command does: the block is rebuilt, so nothing the anchor was read from is left.
        querySelector(wrapper, ".start").innerHTML = "ze<strong>r</strong>o"
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const strong = getFirstChild(wrapper, ".start strong");
        expectCursor(cursorPosition, strong, "".length, strong, "r".length);
    });

    test("Should collapse after what was written when the text changed", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        wrapper.innerHTML = `<p class="start">zexro</p>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length);
    });

    // The carrier is an empty text, so its start and the end of the text before it count to the same offset.
    test("Should stand the cursor in the carrier", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);

        const carrier = document.createTextNode("");
        const strong = document.createElement("strong");
        strong.appendChild(carrier);
        getCursorPosition().range.insertNode(strong);
        Carrier.getInstance().setCarrier(carrier);
        selectRange(carrier, 0, carrier, 0);

        const cursorAnchor = getCursorAnchor(wrapper);
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, carrier, 0);
    });

    // The carrier is inserted after the anchor is read, so only the command tells the caret goes into it.
    test("Should take the caret into the tag a tag command inserts on it", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), {action: Action.Tag, tag: "STRONG"});

        wrapper.innerHTML = `<p class="start">ze<strong></strong>ro</p>`;
        const carrier = document.createTextNode("");
        wrapper.querySelector("strong")?.appendChild(carrier);
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, carrier, 0);
    });

    test("Should walk on to the block that follows when the block was divided", () => {
        const wrapper = createWrapper(`<p class="start">zerofirst</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "zero".length, getFirstChild(wrapper, ".start"), "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        // The block the offset was measured against no longer holds that much text: what followed the
        // cursor is standing in a block of its own now, and the offset left over once this block's text
        // is spent counts into it.
        wrapper.innerHTML = `<p class="start">zero</p><p class="end">first</p>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".end"), "".length);
    });

    // A triple click selects a line from its start to the start of the block below it.
    test("Should leave the caret after the text typed over a line selected up to the start of the next block", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const zero = getFirstChild(wrapper, ".start");
        const end = wrapper.querySelector(".end") as HTMLElement
        selectRange(zero, "".length, end, 0);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("K"));

        wrapper.innerHTML = `<p class="start">z</p><p class="end">first</p>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const z = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, z, "z".length);
    });

    // The two blocks are joined around what was typed, so the caret counts along the block the start was read in.
    test("Should leave the caret after the text typed over a selection reaching into the next block", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p><p>second</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("k"));

        wrapper.innerHTML = `<p class="start">zekrst</p><p>second</p>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zek".length);
    });

    test("Should resolve the anchor when the br the command left the caret on is gone", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li><br></li></ul>`);
        selectRange(getFirstChild(wrapper, ".start"), "zero".length, getFirstChild(wrapper, ".start"), "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper);

        wrapper.querySelector("br")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
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
        const cursorAnchor = getCursorAnchor(wrapper);

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
        const cursorAnchor = getCursorAnchor(wrapper);

        wrapper.innerHTML = `<ul><li class="start">zero</li><li class="end">first</li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);
    });
});

describe("Cursor anchor after a Backspace", () => {
    test("Should stay the same", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        (wrapper.querySelector(".start") as HTMLElement).innerHTML = "<br>";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    // An emoji is two UTF-16 units; stepping back one would land between its halves.
    test("Should step back over both units of an emoji Backspace removes", () => {
        const wrapper = createWrapper(`<p class="start">zero😀first</p>`);
        const text = getFirstChild(wrapper, ".start") as Text;
        selectRange(text, "zero😀".length, text, "zero😀".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        text.data = "zerofirst";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, text, "zero".length);
    });

    // The emptied item and the end of the item above count to the same offset.
    test("Should keep the caret on the item Backspace emptied", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">f</li></ul>`);
        const f = getFirstChild(wrapper, ".start");
        selectRange(f, "f".length, f, "f".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        (wrapper.querySelector(".start") as HTMLElement).innerHTML = "<br>";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, 0);
    });

    // The emptied strong opened the item, so the caret stays at its start rather than the end of the item above.
    test("Should keep the caret on the item when Backspace empties the strong opening it", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start"><strong>f</strong>second</li></ul>`);
        const second = getLastChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelector(".start strong")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    // The merged text keeps its strong; the caret stays at the end of the line above, not inside it.
    test("Should leave the caret at the end of the item above when Backspace merges two items", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><strong>first</strong></li></ul>`);
        const first = getFirstChild(wrapper, ".end strong");
        selectRange(first, "".length, first, "".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        const start = querySelector(wrapper, ".start");
        const strong = querySelector(wrapper, ".end strong");
        start.append(strong);
        const end = querySelector(wrapper, ".end");
        end.remove();

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const zero = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zero, "zero".length);
    });

    // A br holds no text, so nothing is subtracted for it.
    test("Should keep the offset when Backspace removes a line break1", () => {
        const wrapper = createWrapper(`<p class="start">zero<br>first</p>`);
        const first = getLastChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        const br = querySelector(wrapper, ".start br");
        br.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const zeroFirst = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zeroFirst, "zero".length);
    });

    // A br holds no text, so nothing is subtracted for it.
    test("Should keep the offset when Backspace removes a line break", () => {
        const wrapper = createWrapper(`<p class="start">zero<br>first</p><p>second</p>`);
        const first = getLastChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.innerHTML = `<p class="start">zerofirst</p><p>second</p>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const text = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, text, "zero".length);
    });

    test("Should keep the offset when Backspace removes a line break that locates after another line break", () => {
        const wrapper = createWrapper(`<p class="start">zero<br><br>first</p>`);
        const first = getLastChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelectorAll(".start br")[1]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, first, "".length);
    });

    test("Should keep the offset when Backspace removes a line break that locates after another two line breaks", () => {
        const wrapper = createWrapper(`<p class="start">zero<br><br><br><br>first</p>`);
        const thirdBr = wrapper.querySelectorAll(".start br")[2] as HTMLElement;
        selectRange(thirdBr, "".length, thirdBr, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        thirdBr.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const secondBr = wrapper.querySelectorAll(".start br")[1] as HTMLElement;
        expectCursor(cursorPosition, secondBr, "".length);
    });

    // The brs closing the strong stand between its text and the caret, so Backspace removes a br, not a character.
    test("Should keep the caret on its line when Backspace removes a line break at the end of a strong", () => {
        const wrapper = createWrapper(`<p class="start">zero<strong>first<br><br></strong>second</p>`);
        const second = getLastChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelectorAll(".start br")[1]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getLastChild(wrapper, ".start"), "".length);
    });

    // Only the brs after the last text stand between it and the caret; the brs before the text are not counted.
    test("Should keep the caret on its line when Backspace removes a line break after text standing below line breaks", () => {
        const wrapper = createWrapper(`<p class="start">zero<br><br>first<br><br>second</p>`);
        const second = getLastChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelectorAll(".start br")[3]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getLastChild(wrapper, ".start"), "".length);
    });

    test("Should set cursor at start of zero when Backspace removes a line break", () => {
        const wrapper = createWrapper(`<ul><li class="start"><br></li><li class="end">zero</li></ul>`);
        let zero = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, zero, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.innerHTML = `<ul><li class="start">zero</li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        zero = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zero, "".length);
    });

    // An empty line above only loses a br; the caret's paragraph stays where it is.
    test("Should keep the caret at the start of its paragraph when Backspace removes a line break of the empty paragraph above", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="middle"><br><br></p><p class="end">first</p><p>second</p>`);
        const first = getFirstChild(wrapper, ".end");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelectorAll(".middle br")[1]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, first, "".length);
    });

    test("Should keep the caret at the start of its paragraph when Backspace removes a line break of the paragraph with mixed conent above", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="middle"><br>first<br><br></p><p class="end">second</p><p>third</p>`);
        const second = getFirstChild(wrapper, ".end");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelectorAll(".middle br")[1]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, second, "".length);
    });

    test("Should set cursor at start of zero when Backspace removes second line break", () => {
        const wrapper = createWrapper(`<p class="start"><br><br></p><p class="end">zero</p>`);
        let zero = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, zero, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.innerHTML = `<ul><li class="start"><br>zero</li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        zero = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, zero, "".length);
    });

    test("Should set cursor at start of zero when Backspace removes third line break", () => {
        const wrapper = createWrapper(`<p class="start"><br><br><br></p><p class="end">zero</p>`);
        let zero = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, zero, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.innerHTML = `<ul><li class="start"><br><br>zero</li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        zero = getLastChild(wrapper, ".start");
        expectCursor(cursorPosition, zero, "".length);
    });

    test("Should restore the selection onto the block rebuilt in place", () => {
        const wrapper = createWrapper(`<p>start</p><p class="start">zero</p><p>end</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "zer".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), {action: Action.Tag, tag: "STRONG"});

        // What a command does: the block is rebuilt, so nothing the anchor was read from is left.
        (wrapper.childNodes[1] as HTMLElement).outerHTML = `<h1 class="start">ze<strong>r</strong>o</h1>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start strong"), "".length,
            getFirstChild(wrapper, ".start strong"), "r".length);
    });

    test("Should restore the selection onto the rebuilt block when the block before it is removed", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="be-image"><img src="image.png"></p><p class="start">first</p><p>second</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "f".length, getFirstChild(wrapper, ".start"), "fir".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), {action: Action.Tag, tag: "STRONG"});

        wrapper.querySelector(".be-image")?.remove();
        (wrapper.childNodes[1] as HTMLElement).outerHTML = `<h1 class="start">f<strong>ir</strong>st</h1>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start strong"), "".length,
            getFirstChild(wrapper, ".start strong"), "ir".length);
    });

    test("Should keep the offset when Backspace removes an inline image", () => {
        const wrapper = createWrapper(`<p class="start">zero<img src="image.png">first</p>`);
        const text = getLastChild(wrapper, ".start");
        selectRange(text, 0, text, 0);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelector(".start img")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
    });

    // The anchor counts from the image block, which Backspace removes.
    test("Should keep the caret on the line after the image block Backspace removed", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="be-image"><img src="image.png"></p><p class="start">first</p>`);
        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelector(".be-image")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, first, 0);
    });

    test("Should keep the caret on its line when Backspace removes the image block after the first two lines", () => {
        const wrapper = createWrapper(`<p>zero</p><p>first</p><p class="be-image"><img src="image.png"></p><p class="start">second</p>`);
        const second = getFirstChild(wrapper, ".start");
        selectRange(second, "".length, second, "".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        wrapper.querySelector(".be-image")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, second, "".length);
    });

    // The paragraph the anchor counts from absorbs the caret's paragraph.
    test("Should count from the paragraph before when Backspace merges two paragraphs", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const first = getFirstChild(wrapper, ".end");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        (wrapper.querySelector(".start") as HTMLElement).append(first);
        wrapper.querySelector(".end")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
    });

    // The nested item joins the item above; Backspace removes no text, so the offset stays.
    test("Should keep the offset when Backspace merges a nested item into its parent", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero<ul><li class="end">first</li></ul></li></ul>`);
        const first = getFirstChild(wrapper, ".end");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        (wrapper.querySelector(".start") as HTMLElement).append(first);
        wrapper.querySelector(".start ul")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
    });

    // An empty text holds nothing to remove; Backspace steps over it to the emoji before.
    test("Should step over an empty text to the emoji Backspace removes", () => {
        const wrapper = createWrapper(`<p><strong class="start">zero😀</strong>first</p>`);
        (wrapper.querySelector(".start") as HTMLElement).append(document.createTextNode(""));
        const first = getLastChild(wrapper, "p");
        selectRange(first, "".length, first, "".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        (getFirstChild(wrapper, ".start") as Text).data = "zero";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
    });

    // The caret stands on the paragraph after the strong, so Backspace removes the strong's last character.
    test("Should step back into the node before a caret placed on its parent", () => {
        const wrapper = createWrapper(`<p>zero<strong class="start">first</strong>second</p>`);
        const second = getLastChild(wrapper, "p");
        selectRange(second, "".length, second, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        getFirstChild(wrapper, ".start").textContent = "firs";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "firs".length);
    });

    // The strong still stands before the caret on its line, so the caret stays on this item.
    test("Should keep the caret on the item when Backspace empties the text after a strong", () => {
        const wrapper = createWrapper(`<ul><li><strong class="start">zero</strong>f</li><li>second</li></ul>`);
        const text = getLastChild(wrapper, "li");
        selectRange(text, "f".length, text, "f".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        (text as Text).remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zero".length);
    });

    test("Should go before empty block", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start">first</p><p class="end"><br></p>`);
        const br = getFirstChild(wrapper, ".end");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Backspace"));

        querySelector(wrapper, ".end").remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const first = getFirstChild(wrapper, ".start")
        expectCursor(cursorPosition, first, "first".length);
    });
});

describe("Cursor anchor after a Delete", () => {
    test("Should stay the same", () => {
        const wrapper = createWrapper(`<p class="start">z</p>`);
        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        (wrapper.querySelector(".start") as HTMLElement).innerHTML = "<br>";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    // Delete removes the text after the caret, so the caret keeps its offset whatever the removed length.
    test("Should keep the offset when Delete removes both units of an emoji", () => {
        const wrapper = createWrapper(`<p class="start">zero😀first</p>`);
        const text = getFirstChild(wrapper, ".start") as Text;
        selectRange(text, "zero".length, text, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        text.data = "zerofirst";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, text, "zero".length);
    });

    // The emptied item and the end of the item above count to the same offset.
    test("Should keep the caret on the item Delete emptied", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">f</li></ul>`);
        const f = getFirstChild(wrapper, ".start");
        selectRange(f, "".length, f, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        (wrapper.querySelector(".start") as HTMLElement).innerHTML = "<br>";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, 0);
    });

    // The emptied strong opened the item, so the caret stays at its start rather than the end of the item above.
    test("Should keep the caret on the item when Delete empties the strong opening it", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start"><strong>f</strong>second</li></ul>`);
        const f = getFirstChild(wrapper, ".start strong");
        selectRange(f, "".length, f, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        const strong = querySelector(wrapper, ".start strong");
        strong.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    // The merged text keeps its strong; the caret stays at the end of its own line, not inside the strong.
    test("Should leave the caret at the end of the item when Delete merges the item below", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li><li class="end"><strong>first</strong></li></ul>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        const start = querySelector(wrapper, ".start");
        const strong = querySelector(wrapper, ".end strong");
        start.append(strong);
        const end = querySelector(wrapper, ".end");
        end.remove();

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // A br holds no text, so nothing changes in the offset.
    test("Should keep the offset when Delete removes a line break", () => {
        const wrapper = createWrapper(`<p class="start">zero<br>first</p>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        const br = querySelector(wrapper, ".start br");
        br.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Should keep the offset when Delete removes a line break that locates before another line break", () => {
        const wrapper = createWrapper(`<p class="start">zero<br><br>first</p>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        wrapper.querySelectorAll(".start br")[0]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    test("Should keep the caret on its line break when Delete removes the line break after it", () => {
        const wrapper = createWrapper(`<p class="start">zero<br><br><br><br>first</p>`);
        const secondBr = wrapper.querySelectorAll(".start br")[1] as HTMLElement;
        selectRange(secondBr, "".length, secondBr, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        wrapper.querySelectorAll(".start br")[2]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, secondBr, "".length);
    });

    // An empty line only loses a br; the caret stays on it.
    test("Should keep the caret on the empty paragraph when Delete removes one of its line breaks", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start"><br><br></p><p>first</p>`);
        const firstBr = getFirstChild(wrapper, ".start");
        selectRange(firstBr, "".length, firstBr, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        wrapper.querySelectorAll(".start br")[1]?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "".length);
    });

    test("Should keep the caret at the start of zero when Delete removes the empty item it stands on", () => {
        const wrapper = createWrapper(`<ul><li class="start"><br></li><li class="end">zero</li></ul>`);
        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        wrapper.innerHTML = `<ul><li class="start">zero</li></ul>`;
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const zero = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zero, "".length);
    });

    test("Should keep the offset when Delete removes an inline image", () => {
        const wrapper = createWrapper(`<p class="start">zero<img src="image.png">first</p>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        wrapper.querySelector(".start img")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // The anchor counts from the block before the caret's line, which Delete leaves in place.
    test("Should keep the caret on the line before the image block Delete removed", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="be-image"><img src="image.png"></p><p>first</p>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        wrapper.querySelector(".be-image")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // The caret's paragraph absorbs the paragraph after it.
    test("Should keep the caret at the end of its paragraph when Delete merges two paragraphs", () => {
        const wrapper = createWrapper(`<p class="start">zero</p><p class="end">first</p>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        (wrapper.querySelector(".start") as HTMLElement).append(getFirstChild(wrapper, ".end"));
        wrapper.querySelector(".end")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // The nested item joins its parent; Delete removes no text, so the offset stays.
    test("Should keep the offset when Delete merges a nested item into its parent", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero<ul><li class="end">first</li></ul></li></ul>`);
        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        (wrapper.querySelector(".start") as HTMLElement).append(getFirstChild(wrapper, ".end"));
        wrapper.querySelector(".start ul")?.remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // An empty text holds nothing to remove; Delete steps over it to the emoji after.
    test("Should step over an empty text to the emoji Delete removes", () => {
        const wrapper = createWrapper(`<p>zero<strong class="start">😀first</strong></p>`);
        (wrapper.querySelector(".start") as HTMLElement).prepend(document.createTextNode(""));
        const zero = getFirstChild(wrapper, "p");
        selectRange(zero, "zero".length, zero, "zero".length);

        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        (getLastChild(wrapper, ".start") as Text).data = "first";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // The caret stands at the end of the text before the strong, so Delete removes the strong's first character.
    test("Should keep the caret before the node after it when Delete removes its first character", () => {
        const wrapper = createWrapper(`<p>zero<strong class="start">first</strong>second</p>`);
        const zero = getFirstChild(wrapper, "p");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        getFirstChild(wrapper, ".start").textContent = "irst";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, zero, "zero".length);
    });

    // The strong still stands after the caret on its line, so the caret stays on this item.
    test("Should keep the caret on the item when Delete empties the text before a strong", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">f<strong>second</strong></li></ul>`);
        const f = getFirstChild(wrapper, ".start");
        selectRange(f, "".length, f, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        (f as Text).remove();
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const second = getFirstChild(wrapper, ".start strong")
        expectCursor(cursorPosition, second, "".length);
    });

    // The caret stands after the br, so Delete removes the first character of the text after it.
    test("Should keep the caret after the line break when Delete removes the first character after it", () => {
        const wrapper = createWrapper(`<p class="start">zero<br>first</p>`);
        const first = getLastChild(wrapper, ".start") as Text;
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        first.data = "irst";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, first, "".length);
    });

    test("Should keep the caret after both line breaks when Delete removes the first character after them", () => {
        const wrapper = createWrapper(`<p class="start">zero<br><br>first</p>`);
        const first = getLastChild(wrapper, ".start") as Text;
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        first.data = "irst";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        expectCursor(cursorPosition, first, "".length);
    });

    // No br stands before the strong, so the caret at its start and the end of the text before it are one place.
    test("Should keep the offset when Delete removes the first character of a strong after text", () => {
        const wrapper = createWrapper(`<p>zero<strong class="start">first</strong></p>`);
        const first = getFirstChild(wrapper, ".start") as Text;
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        first.data = "irst";
        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);

        const irst = getFirstChild(wrapper, ".start")
        expectCursor(cursorPosition, irst, "".length);
    });
});

describe("Deletes range end from a caret on a br", () => {
    // The offset counts from the list, so it lands on the end of the text above, one step before the caret's br.
    test("Should end at the start of the nested line after an empty item below text", () => {
        const wrapper = createWrapper(`
              <ol>
                  <li>zero</li>
                  <li class="start"><br>
                      <ol><li class="end">first</li></ol>
                  </li>
              </ol>
          `);
        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);

        const cursorPosition = resolveCursorAnchor(wrapper, getNextCharacterAnchor(wrapper, getCursorPosition()));

        const first = getFirstChild(wrapper, ".end");
        expectCursor(cursorPosition, first, "".length);
    });

    // Every br of the run before the caret holds no text, so the anchor steps over all of them.
    test("Should end at the start of the next paragraph from an empty line after text", () => {
        const wrapper = createWrapper(`
              <p class="start">zero<br><br></p>
              <p class="end">first</p>
          `);
        const br = getLastChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);

        const cursorPosition = resolveCursorAnchor(wrapper, getNextCharacterAnchor(wrapper, getCursorPosition()));

        const first = getFirstChild(wrapper, ".end");
        expectCursor(cursorPosition, first, "".length);
    });
});
