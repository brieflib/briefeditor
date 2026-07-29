import {getRange} from "@/core/shared/range-util";
import {createWrapper, getFirstChild} from "@/core/shared/test-util";
import {TableCursor} from "@/core/cursor/table-cursor";
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

const TABLE = `
    <table class="table">
        <thead><tr><th class="first">zero</th><th>first</th></tr></thead>
        <tbody><tr><td>second</td><td class="last">third</td></tr></tbody>
    </table>
`;

function select(container: Node, offset: number) {
    const range = new Range();
    range.setStart(container, offset);
    range.setEnd(container, offset);
    (getRange as jest.Mock).mockReturnValue(range);
}

function selectRange(startContainer: Node, startOffset: number, endContainer: Node, endOffset: number) {
    const range = new Range();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);
    (getRange as jest.Mock).mockReturnValue(range);
}

function keydownEvent(key: string, options: KeyboardEventInit = {}) {
    return new KeyboardEvent("keydown", {key, cancelable: true, ...options});
}

// jsdom only assigns a target while dispatching, and dispatching would reach the real document listener.
function mousedownEvent(target: Node, options: MouseEventInit = {}) {
    const event = new MouseEvent("mousedown", {button: 0, cancelable: true, ...options});
    Object.defineProperty(event, "target", {value: target});

    return event;
}

function cursorPositionAt(container: Node, offset: number) {
    return getCursorPositionFrom(container, offset, container, offset);
}

function table(wrapper: HTMLElement) {
    return wrapper.querySelector(".table") as HTMLTableElement;
}

function indexOfTable(wrapper: HTMLElement) {
    return Array.from(wrapper.childNodes).indexOf(table(wrapper));
}

describe("Table cursor", () => {
    // The cursor never rests next to a table any more, so what used to be tested through a correcting
    // selection change is now tested through the two events that are taken over instead.
    test("Should move into the previous table when two tables are adjacent", () => {
        const wrapper = createWrapper(`${TABLE}<table class="second"><tbody><tr><td class="cell">fourth</td></tr></tbody></table>`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".cell"), "".length);
        const keyboardEvent = keydownEvent("ArrowLeft");
        const cursorPosition = tableCursor.onKeyDown(keyboardEvent);

        expect(keyboardEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should keep the cursor in the last cell when there is no next block", () => {
        const wrapper = createWrapper(TABLE);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "third".length);
        const keyboardEvent = keydownEvent("ArrowRight");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(true);
    });

    test("Should not take over an arrow key over a selection that spans the table", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        selectRange(getFirstChild(wrapper, ".before"), "".length, wrapper, indexOfTable(wrapper));
        const keyboardEvent = keydownEvent("ArrowLeft");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should move a click into the first cell when the point resolves to the table element", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const cursorPosition = tableCursor.onMouseDown(mousedownEvent(wrapper), cursorPositionAt(table(wrapper), "".length));

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should move a click into the last cell when the point resolves to the end of the table body", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);
        const tbody = wrapper.querySelector("tbody") as HTMLElement;

        const cursorPosition = tableCursor.onMouseDown(mousedownEvent(wrapper), cursorPositionAt(tbody, tbody.childNodes.length));

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });


    test("Should take over the arrow left that would leave the first cell", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        const keyboardEvent = keydownEvent("ArrowLeft");
        const cursorPosition = tableCursor.onKeyDown(keyboardEvent);

        expect(keyboardEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".before"));
        expect(cursorPosition?.startOffset).toBe("before".length);
    });

    test("Should take over the arrow right that would leave the last cell", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "third".length);
        const keyboardEvent = keydownEvent("ArrowRight");
        const cursorPosition = tableCursor.onKeyDown(keyboardEvent);

        expect(keyboardEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should block the arrow left when there is no previous block", () => {
        const wrapper = createWrapper(TABLE);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        const keyboardEvent = keydownEvent("ArrowLeft");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(true);
    });

    test("Should take over the arrow right that would enter the table", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".before"), "before".length);
        const keyboardEvent = keydownEvent("ArrowRight");
        const cursorPosition = tableCursor.onKeyDown(keyboardEvent);

        expect(keyboardEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should take over the arrow left that would enter the table", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".after"), "".length);
        const keyboardEvent = keydownEvent("ArrowLeft");
        const cursorPosition = tableCursor.onKeyDown(keyboardEvent);

        expect(keyboardEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should not enter the table from the middle of the previous block", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".before"), "bef".length);
        const keyboardEvent = keydownEvent("ArrowRight");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should enter the table only from the end of the last item of a list", () => {
        const wrapper = createWrapper(`<ul><li class="one">one</li><li class="two">two</li></ul>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".one"), "one".length);
        const notLast = keydownEvent("ArrowRight");
        expect(tableCursor.onKeyDown(notLast)).toBeNull();
        expect(notLast.defaultPrevented).toBe(false);

        select(getFirstChild(wrapper, ".two"), "two".length);
        const last = keydownEvent("ArrowRight");
        const cursorPosition = tableCursor.onKeyDown(last);

        expect(last.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
    });

    test("Should not take over an arrow left inside the first cell", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "ze".length);
        const keyboardEvent = keydownEvent("ArrowLeft");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over an arrow left at the start of a cell that is not the first one", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "".length);
        const keyboardEvent = keydownEvent("ArrowLeft");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over an arrow right at the end of a cell that is not the last one", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "zero".length);
        const keyboardEvent = keydownEvent("ArrowRight");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a shifted arrow left that extends the selection", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        const keyboardEvent = keydownEvent("ArrowLeft", {shiftKey: true});

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a vertical arrow key", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        const keyboardEvent = keydownEvent("ArrowUp");

        expect(tableCursor.onKeyDown(keyboardEvent)).toBeNull();
        expect(keyboardEvent.defaultPrevented).toBe(false);
    });

    test("Should not read the selection for a key it cannot take over", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        (getRange as jest.Mock).mockClear();

        expect(tableCursor.onKeyDown(keydownEvent("x"))).toBeNull();
        expect(getRange).not.toHaveBeenCalled();
    });

    test("Should take over a click that would land before the table", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper);
        const cursorPosition = tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper)));

        expect(mouseEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should take over a click that would land after the table", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper);
        const cursorPosition = tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper) + 1));

        expect(mouseEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should move a click into the table even when the cursor was already inside it", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "third".length);

        const cursorPosition = tableCursor.onMouseDown(mousedownEvent(wrapper), cursorPositionAt(wrapper, indexOfTable(wrapper)));

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should not take over a click inside a cell", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper);

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(getFirstChild(wrapper, ".first"), "ze".length))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a click inside a paragraph", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper);

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(getFirstChild(wrapper, ".before"), "be".length))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    // Nothing tests whether an event belongs to the editor, so the listeners must not receive any other.
    test("Should not listen to events outside of the editor", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const outside = document.createElement("div");
        outside.innerHTML = `<table class="outside"><tbody><tr><td>fourth</td></tr></tbody></table>`;
        document.body.appendChild(outside);
        const tableCursor = new TableCursor(wrapper);
        const onKeyDown = jest.spyOn(tableCursor, "onKeyDown");
        const onMouseDown = jest.spyOn(tableCursor, "onMouseDown");

        outside.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowLeft", bubbles: true}));
        outside.dispatchEvent(new MouseEvent("mousedown", {button: 0, bubbles: true}));

        expect(onKeyDown).not.toHaveBeenCalled();
        expect(onMouseDown).not.toHaveBeenCalled();
    });

    test("Should listen to events inside of the editor", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);
        const onKeyDown = jest.spyOn(tableCursor, "onKeyDown");
        const onMouseDown = jest.spyOn(tableCursor, "onMouseDown");
        document.caretPositionFromPoint = jest.fn();

        select(getFirstChild(wrapper, ".before"), "be".length);
        getFirstChild(wrapper, ".before").parentElement?.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowLeft", bubbles: true}));
        getFirstChild(wrapper, ".before").parentElement?.dispatchEvent(new MouseEvent("mousedown", {button: 0, bubbles: true}));
        delete (document as Partial<Document>).caretPositionFromPoint;

        expect(onKeyDown).toHaveBeenCalled();
        expect(onMouseDown).toHaveBeenCalled();
    });

    test("Should resolve the point only for a click it can take over", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);
        const caretPositionFromPoint = jest.fn();
        document.caretPositionFromPoint = caretPositionFromPoint;

        tableCursor.onMouseDown(mousedownEvent(wrapper, {button: 2}));
        tableCursor.onMouseDown(mousedownEvent(wrapper, {shiftKey: true}));
        const skipped = caretPositionFromPoint.mock.calls.length;

        tableCursor.onMouseDown(mousedownEvent(wrapper));
        const resolved = caretPositionFromPoint.mock.calls.length;
        delete (document as Partial<Document>).caretPositionFromPoint;

        expect(skipped).toBe(0);
        expect(resolved).toBe(1);
    });

    test("Should not take over a click of a secondary button", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper, {button: 2});

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper)))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a shifted click that extends the selection", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper, {shiftKey: true});

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper)))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a click whose point maps to nothing", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent(wrapper);

        expect(tableCursor.onMouseDown(mouseEvent, null)).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

});
