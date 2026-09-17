import {getRange} from "@/core/shared/range-util";
import {createWrapper, getFirstChild} from "@/core/shared/test-util";
import {ImageCursor} from "@/core/cursor/image-cursor";
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

const IMAGE = `<p class="image be-image"><img src="image.png"></p>`;

function select(container: Node, offset: number) {
    const range = new Range();
    range.setStart(container, offset);
    range.setEnd(container, offset);
    (getRange as jest.Mock).mockReturnValue(range);

    return range;
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

function image(wrapper: HTMLElement) {
    return wrapper.querySelector(".image") as HTMLElement;
}

/** Gives `element` a layout of `height` at `top`, since jsdom lays nothing out on its own. */
function layout(element: Element, top: number, height: number) {
    element.getBoundingClientRect = () => new DOMRect(0, top, 100, height);
}

/** Puts the caret's rect `top` down, one line high. */
function caretAt(range: Range, top: number, height: number) {
    range.getClientRects = () => [new DOMRect(0, top, 0, height)] as unknown as DOMRectList;
}

describe("Image cursor", () => {
    describe("Horizontal move", () => {
        test("Should carry the arrow right over the image to the start of the line after it", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "before".length);
            const keyboardEvent = keydownEvent("ArrowRight");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });

        test("Should carry the arrow left over the image to the end of the line before it", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".after"), "".length);
            const keyboardEvent = keydownEvent("ArrowLeft");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".before"));
            expect(cursorPosition?.startOffset).toBe("before".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".before"));
            expect(cursorPosition?.endOffset).toBe("before".length);
        });

        test("Should carry the arrow right out of the last item of a list over the image", () => {
            const wrapper = createWrapper(`<ul><li>zero</li><li class="before">before</li></ul>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "before".length);
            const keyboardEvent = keydownEvent("ArrowRight");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });

        test("Should leave the arrow right alone before the end of the line", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "bef".length);
            const keyboardEvent = keydownEvent("ArrowRight");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });

        test("Should leave the arrow alone when the neighbouring block is no image", () => {
            const wrapper = createWrapper(`<p class="before">before</p><p class="after">after</p>${IMAGE}`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "before".length);
            const keyboardEvent = keydownEvent("ArrowRight");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });

        test("Should drop the move when nothing stands beyond the image", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "before".length);
            const keyboardEvent = keydownEvent("ArrowRight");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(true);
        });

        test("Should leave a shifted arrow alone, since it extends the selection", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "before".length);
            const keyboardEvent = keydownEvent("ArrowRight", {shiftKey: true});

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });

        test("Should not take over an arrow key over a selection", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            selectRange(getFirstChild(wrapper, ".before"), "bef".length, getFirstChild(wrapper, ".before"), "before".length);
            const keyboardEvent = keydownEvent("ArrowRight");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });
    });

    describe("Vertical move", () => {
        test("Should carry the arrow down from the last line over the image", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            const before = wrapper.querySelector(".before") as HTMLElement;
            layout(before, 0, 40);

            const range = select(getFirstChild(wrapper, ".before"), "bef".length);
            caretAt(range, 20, 20);
            const keyboardEvent = keydownEvent("ArrowDown");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });

        test("Should leave the arrow down alone above the last line of the block", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            const before = wrapper.querySelector(".before") as HTMLElement;
            layout(before, 0, 40);

            const range = select(getFirstChild(wrapper, ".before"), "bef".length);
            caretAt(range, 0, 20);
            const keyboardEvent = keydownEvent("ArrowDown");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });

        test("Should carry the arrow up from the first line over the image", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            const after = wrapper.querySelector(".after") as HTMLElement;
            layout(after, 100, 40);

            const range = select(getFirstChild(wrapper, ".after"), "aft".length);
            caretAt(range, 100, 20);
            const keyboardEvent = keydownEvent("ArrowUp");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".before"));
            expect(cursorPosition?.startOffset).toBe("before".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".before"));
            expect(cursorPosition?.endOffset).toBe("before".length);
        });

        test("Should leave the arrow up alone below the first line of the block", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            const after = wrapper.querySelector(".after") as HTMLElement;
            layout(after, 100, 40);

            const range = select(getFirstChild(wrapper, ".after"), "aft".length);
            caretAt(range, 120, 20);
            const keyboardEvent = keydownEvent("ArrowUp");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });

        test("Should leave the arrow down alone in an item above the last one", () => {
            const wrapper = createWrapper(`<ul><li class="first">zero</li><li>before</li></ul>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".first"), "zero".length);
            const keyboardEvent = keydownEvent("ArrowDown");

            expect(imageCursor.onKeyDown(keyboardEvent)).toBeNull();
            expect(keyboardEvent.defaultPrevented).toBe(false);
        });

        test("Should carry the arrow down out of the last item over the image", () => {
            const wrapper = createWrapper(`<ul><li>zero</li><li class="before">before</li></ul>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "bef".length);
            const keyboardEvent = keydownEvent("ArrowDown");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });

        test("Should read an empty line as its own edge line", () => {
            const wrapper = createWrapper(`<p class="before"><br></p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            select(getFirstChild(wrapper, ".before"), "".length);
            const keyboardEvent = keydownEvent("ArrowDown");
            const cursorPosition = imageCursor.onKeyDown(keyboardEvent);

            expect(keyboardEvent.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });
    });

    describe("Click", () => {
        test("Should move a click on the upper half of the image to the end of the line before it", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            layout(image(wrapper), 100, 200);

            const event = mousedownEvent(image(wrapper), {clientY: 150});
            const cursorPosition = imageCursor.onMouseDown(event, cursorPositionAt(image(wrapper), 0));

            expect(event.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".before"));
            expect(cursorPosition?.startOffset).toBe("before".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".before"));
            expect(cursorPosition?.endOffset).toBe("before".length);
        });

        test("Should move a click on the lower half of the image to the start of the line after it", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            layout(image(wrapper), 100, 200);

            const event = mousedownEvent(image(wrapper), {clientY: 250});
            const cursorPosition = imageCursor.onMouseDown(event, cursorPositionAt(image(wrapper).firstChild as Node, 0));

            expect(event.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });

        test("Should fall back to the only neighbour the image has", () => {
            const wrapper = createWrapper(`${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);
            layout(image(wrapper), 100, 200);

            const event = mousedownEvent(image(wrapper), {clientY: 150});
            const cursorPosition = imageCursor.onMouseDown(event, cursorPositionAt(image(wrapper), 0));

            expect(event.defaultPrevented).toBe(true);
            expect(cursorPosition?.startContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.startOffset).toBe("".length);
            expect(cursorPosition?.endContainer).toBe(getFirstChild(wrapper, ".after"));
            expect(cursorPosition?.endOffset).toBe("".length);
        });

        test("Should leave a click outside the image alone", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            const event = mousedownEvent(wrapper);

            expect(imageCursor.onMouseDown(event, cursorPositionAt(getFirstChild(wrapper, ".before"), 2))).toBeNull();
            expect(event.defaultPrevented).toBe(false);
        });

        test("Should leave a shifted click alone, since it extends the selection", () => {
            const wrapper = createWrapper(`<p class="before">before</p>${IMAGE}<p class="after">after</p>`);
            const imageCursor = new ImageCursor(wrapper);

            const event = mousedownEvent(image(wrapper), {shiftKey: true});

            expect(imageCursor.onMouseDown(event, cursorPositionAt(image(wrapper), 0))).toBeNull();
            expect(event.defaultPrevented).toBe(false);
        });
    });
});
