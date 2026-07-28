import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
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

function mousedownEvent(options: MouseEventInit = {}) {
    return new MouseEvent("mousedown", {button: 0, cancelable: true, ...options});
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
    test("Should move to the previous block when leaving the table backwards", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper));
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".before"));
        expect(cursorPosition?.startOffset).toBe("before".length);
        expectHtml(wrapper.innerHTML, `<p class="before">before</p>${TABLE}`);
    });

    test("Should keep the cursor in the first cell when there is no previous block", () => {
        const wrapper = createWrapper(TABLE);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper));
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should move to the next block when leaving the table forwards", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "third".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper) + 1);
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should keep the cursor in the last cell when there is no next block", () => {
        const wrapper = createWrapper(TABLE);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "third".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper) + 1);
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should move into the first cell when arriving from the previous block", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".before"), "before".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper));
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should move into the last cell when arriving from the next block", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".after"), "".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper) + 1);
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should move into the first cell when there is no previous cursor position", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(wrapper, indexOfTable(wrapper));
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should move into the first cell when the cursor is inside the table element", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(table(wrapper), "".length);
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should move into the last cell when the cursor is at the end of the table body", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);
        const tbody = wrapper.querySelector("tbody") as HTMLElement;

        select(tbody, tbody.childNodes.length);
        const cursorPosition = tableCursor.onSelectionChange();

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should move into the previous table when two tables are adjacent", () => {
        const wrapper = createWrapper(`${TABLE}<table class="second"><tbody><tr><td class="cell">fourth</td></tr></tbody></table>`);
        const tableCursor = new TableCursor(wrapper);
        const second = wrapper.querySelector(".second") as HTMLElement;

        select(getFirstChild(wrapper, ".cell"), "".length);
        tableCursor.onSelectionChange();

        select(wrapper, Array.from(wrapper.childNodes).indexOf(second));
        const cursorPosition = tableCursor.onSelectionChange();

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

    test("Should relocate a cursor parked by an earlier event before handling a key", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "".length);
        tableCursor.onSelectionChange();

        select(wrapper, indexOfTable(wrapper));
        tableCursor.onKeyDown(keydownEvent("x"));

        const range = window.getSelection()?.getRangeAt(0);
        expect(range?.startContainer).toBe(getFirstChild(wrapper, ".before"));
        expect(range?.startOffset).toBe("before".length);
    });

    test("Should take over a click that would land before the table", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent();
        const cursorPosition = tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper)));

        expect(mouseEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should take over a click that would land after the table", () => {
        const wrapper = createWrapper(`${TABLE}<p class="after">after</p>`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent();
        const cursorPosition = tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper) + 1));

        expect(mouseEvent.defaultPrevented).toBe(true);
        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".last"));
        expect(cursorPosition?.startOffset).toBe("third".length);
    });

    test("Should move a click into the table even when the cursor was already inside it", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".last"), "third".length);
        tableCursor.onSelectionChange();

        const cursorPosition = tableCursor.onMouseDown(mousedownEvent(), cursorPositionAt(wrapper, indexOfTable(wrapper)));

        expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".first"));
        expect(cursorPosition?.startOffset).toBe("".length);
    });

    test("Should not take over a click inside a cell", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent();

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(getFirstChild(wrapper, ".first"), "ze".length))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a click inside a paragraph", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent();

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(getFirstChild(wrapper, ".before"), "be".length))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a click outside of the editor", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const outside = document.createElement("div");
        outside.innerHTML = `<table class="outside"><tbody><tr><td>fourth</td></tr></tbody></table>`;
        document.body.appendChild(outside);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent();

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(outside, "".length))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a click of a secondary button", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent({button: 2});

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper)))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a shifted click that extends the selection", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent({shiftKey: true});

        expect(tableCursor.onMouseDown(mouseEvent, cursorPositionAt(wrapper, indexOfTable(wrapper)))).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should not take over a click whose point maps to nothing", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        const mouseEvent = mousedownEvent();

        expect(tableCursor.onMouseDown(mouseEvent, null)).toBeNull();
        expect(mouseEvent.defaultPrevented).toBe(false);
    });

    test("Should leave the cursor alone inside a cell", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".first"), "ze".length);

        expect(tableCursor.onSelectionChange()).toBeNull();
    });

    test("Should leave the cursor alone outside of a table", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        select(getFirstChild(wrapper, ".before"), "be".length);

        expect(tableCursor.onSelectionChange()).toBeNull();
    });

    test("Should leave a selection that spans the table alone", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const tableCursor = new TableCursor(wrapper);

        selectRange(getFirstChild(wrapper, ".before"), "".length, wrapper, indexOfTable(wrapper));

        expect(tableCursor.onSelectionChange()).toBeNull();
    });

    test("Should leave a cursor outside of the editor alone", () => {
        const wrapper = createWrapper(`<p class="before">before</p>${TABLE}`);
        const outside = document.createElement("div");
        outside.innerHTML = `<table class="outside"><tbody><tr><td>fourth</td></tr></tbody></table>`;
        document.body.appendChild(outside);
        const tableCursor = new TableCursor(wrapper);

        select(outside, "".length);

        expect(tableCursor.onSelectionChange()).toBeNull();
    });
});
