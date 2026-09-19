import ImageAlt from "@/component/image/image-alt";

jest.mock("@/component/image/asset/image-alt.css?inline=true", () => "");

function rect(left: number, top: number, width: number, height: number) {
    return {left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({})} as DOMRect;
}

function setup(value = "") {
    const scroll = document.createElement("div");
    scroll.id = "be-content";
    scroll.getBoundingClientRect = () => rect(0, 0, 500, 400);
    document.body.appendChild(scroll);

    const alt = new ImageAlt();
    document.body.appendChild(alt);
    alt.value = value;
    const input = (alt.shadowRoot as ShadowRoot).querySelector(".be-image-alt-input") as HTMLInputElement;

    return {alt, input};
}

function keydownEvent(key: string, options: KeyboardEventInit = {}) {
    return new KeyboardEvent("keydown", {key, cancelable: true, ...options});
}

/** Puts the caret in the field, which is where every leaving rule is read from. */
function caretAt(input: HTMLInputElement, start: number, end = start) {
    input.focus();
    input.setSelectionRange(start, end);
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("Image caption field", () => {
    test("Should start hidden", () => {
        const {alt} = setup();

        expect(alt.hidden).toBe(true);
    });

    test("Should lay itself under the image, across its width", () => {
        const {alt} = setup();

        alt.cover(rect(100, 50, 200, 150));

        expect([alt.style.left, alt.style.top, alt.style.width]).toEqual(["100px", "200px", "200px"]);
        expect(alt.hidden).toBe(false);
    });

    test("Should hide once it lies outside the editor's view", () => {
        const {alt} = setup();
        alt.getBoundingClientRect = () => rect(100, 420, 200, 30);

        alt.cover(rect(100, 270, 200, 150));

        expect(alt.style.visibility).toBe("hidden");
    });

    test("Should show the text it is given", () => {
        const {alt, input} = setup("a cat");

        expect(alt.value).toBe("a cat");
        expect(input.value).toBe("a cat");
    });

    test("Should keep the text being typed when it is written to", () => {
        const {alt, input} = setup("a cat");
        input.focus();

        alt.value = "a dog";

        expect(input.value).toBe("a cat");
    });

    test("Should report the text as it is typed", () => {
        const {alt, input} = setup();
        const onInput = jest.fn();
        alt.onInput = onInput;

        input.value = "a cat";
        input.dispatchEvent(new Event("input"));

        expect(onInput).toHaveBeenCalledWith("a cat");
    });

    test("Should take the caret to the end for a move arriving backwards", () => {
        const {alt, input} = setup("a cat");

        alt.focusEdge(true);

        expect((alt.shadowRoot as ShadowRoot).activeElement).toBe(input);
        expect(input.selectionStart).toBe("a cat".length);
    });

    test("Should take the caret to the start for a move arriving forwards", () => {
        const {alt, input} = setup("a cat");

        alt.focusEdge(false);

        expect(input.selectionStart).toBe("".length);
    });

    test.each([
        ["ArrowUp", "a c".length, true],
        ["ArrowDown", "a c".length, false],
        ["ArrowLeft", "".length, true],
        ["ArrowRight", "a cat".length, false]
    ])("Should leave the field on %s", (key, offset, isBefore) => {
        const {alt, input} = setup("a cat");
        const onLeave = jest.fn().mockReturnValue(true);
        alt.onLeave = onLeave;
        caretAt(input, offset as number);

        const event = keydownEvent(key as string);
        input.dispatchEvent(event);

        expect(onLeave).toHaveBeenCalledWith(isBefore);
        expect(event.defaultPrevented).toBe(true);
    });

    test.each([
        ["ArrowLeft", "a c".length],
        ["ArrowRight", "a c".length]
    ])("Should keep the caret on %s with text left to cross", (key, offset) => {
        const {alt, input} = setup("a cat");
        const onLeave = jest.fn().mockReturnValue(true);
        alt.onLeave = onLeave;
        caretAt(input, offset as number);

        const event = keydownEvent(key as string);
        input.dispatchEvent(event);

        expect(onLeave).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    test("Should leave a selection inside the field alone", () => {
        const {alt, input} = setup("a cat");
        const onLeave = jest.fn().mockReturnValue(true);
        alt.onLeave = onLeave;
        caretAt(input, "".length, "a cat".length);

        input.dispatchEvent(keydownEvent("ArrowLeft"));

        expect(onLeave).not.toHaveBeenCalled();
    });

    test("Should leave a modified arrow alone, since it is no plain move", () => {
        const {alt, input} = setup("a cat");
        const onLeave = jest.fn().mockReturnValue(true);
        alt.onLeave = onLeave;
        caretAt(input, "".length);

        input.dispatchEvent(keydownEvent("ArrowUp", {shiftKey: true}));

        expect(onLeave).not.toHaveBeenCalled();
    });

    test("Should keep the key when the cursor had nowhere to go", () => {
        const {alt, input} = setup("a cat");
        alt.onLeave = () => false;
        caretAt(input, "".length);

        const event = keydownEvent("ArrowUp");
        input.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
