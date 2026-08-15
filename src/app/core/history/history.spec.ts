import {getRange} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action, Command} from "@/core/command/type/command";
import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {GROUP_INTERVAL, History} from "@/core/history/history";
import {Carrier} from "@/core/carrier/carrier";
import {CursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

// Every command here stands for an action of its own, so the clock leaves the grouping window open behind it.
// Commands that land closer than that share one entry, which the grouping tests below cover.
function command(wrapper: HTMLElement, next: Command): CursorPosition {
    jest.advanceTimersByTime(GROUP_INTERVAL);
    return execCommand(wrapper, next);
}

function select(wrapper: HTMLElement, selector: string, start: number, end: number) {
    const range = new Range();
    range.setStart(getFirstChild(wrapper, selector), start);
    range.setEnd(getFirstChild(wrapper, selector), end);
    (getRange as jest.Mock).mockReturnValue(range);
}

function keydownEvent(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
    return new KeyboardEvent("keydown", {key, ...options});
}

// Where a command left the cursor is where the editor puts it, so the next command starts from there.
function selectCursor(cursorPosition: CursorPosition) {
    const range = new Range();
    range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
    range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
    (getRange as jest.Mock).mockReturnValue(range);
}

// The image command hands its file to a FileReader, so the insert lands turns after the command is over.
async function waitForImage(wrapper: HTMLElement) {
    for (let attempt = 0; attempt < 100 && !wrapper.querySelector("img"); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
}

function pasteEvent(html: string): ClipboardEvent {
    // jsdom has no DataTransfer, so stub the minimal ClipboardEvent surface used by handleClipboardEvent.
    return {preventDefault: jest.fn(), clipboardData: {getData: () => html}} as unknown as ClipboardEvent;
}

describe("History undo/redo", () => {
    // The carrier is static, so a test that leaves one behind would follow the next one into its first command.
    // Commands run back to back within the same millisecond, so the clock is the test's to move.
    beforeEach(() => {
        jest.useFakeTimers();
        Carrier.removeCarrier();
    });
    afterEach(() => jest.useRealTimers());

    test("Should undo a tag command and restore the original markup", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should redo a previously undone tag command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        history.undo();

        history.redo();

        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);
    });

    test("Should undo a first level command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.FirstLevel, tag: "H1"});
        expectHtml(wrapper.innerHTML, `<h1>zero</h1>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo commands one by one in reverse order", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "".length, "zero".length);
        command(wrapper, {action: Action.FirstLevel, tag: "H1"});
        expectHtml(wrapper.innerHTML, `<h1><strong>zero</strong></h1>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should drop the redo stack after a new command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        history.undo();

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.FirstLevel, tag: "H1"});

        history.redo();

        expectHtml(wrapper.innerHTML, `<h1>zero</h1>`);
    });

    test("Should survive repeated undo/redo cycles", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        for (let cycle = 0; cycle < 3; cycle++) {
            history.undo();
            expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

            history.redo();
            expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);
        }
    });

    test("Should undo and redo attribute changes", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "".length);
        command(wrapper, {action: Action.Attribute, tag: "P", attributes: {class: "changed"}});
        expectHtml(wrapper.innerHTML, `<p class="changed">zero</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p class="changed">zero</p>`);
    });

    test("Should do nothing when the undo stack is empty", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should not record a command that does not change the dom", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "".length);
        command(wrapper, {action: Action.Attribute, tag: "P"});

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo a keyboard newline command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Enter")});

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo a keyboard backspace that merges two blocks", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start">first</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Backspace")});
        expectHtml(wrapper.innerHTML, `<p>zerofirst</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p>zero</p><p class="start">first</p>`);
    });

    test("Should undo and redo a paste that merges into existing text", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Clipboard, event: pasteEvent("pasted")});
        expectHtml(wrapper.innerHTML, `<p>zeropasted</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p>zeropasted</p>`);
    });

    test("Should bold a word in a sentence and handle Ctrl+z, Ctrl+y, Ctrl+z", () => {
        const wrapper = createWrapper(`<p class="start">mark word as bold</p>`);
        new History(wrapper);

        select(wrapper, ".start", "mark ".length, "mark word".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p>mark <strong>word</strong> as bold</p>`);

        wrapper.dispatchEvent(keydownEvent("z", {ctrlKey: true}));
        expectHtml(wrapper.innerHTML, `<p class="start">mark word as bold</p>`);

        wrapper.dispatchEvent(keydownEvent("y", {ctrlKey: true}));
        expectHtml(wrapper.innerHTML, `<p>mark <strong>word</strong> as bold</p>`);

        wrapper.dispatchEvent(keydownEvent("z", {ctrlKey: true}));
        expectHtml(wrapper.innerHTML, `<p class="start">mark word as bold</p>`);
    });

    test("Should replace only the changed paragraph on undo and redo", () => {
        const wrapper = createWrapper(`<p>zero</p><p class="start">first</p><p>second</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "first".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p>zero</p><p><strong>first</strong></p><p>second</p>`);

        const firstParagraph = wrapper.firstChild;
        const lastParagraph = wrapper.lastChild;

        history.undo();
        expectHtml(wrapper.innerHTML, `<p>zero</p><p class="start">first</p><p>second</p>`);
        expect(wrapper.firstChild).toBe(firstParagraph);
        expect(wrapper.lastChild).toBe(lastParagraph);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p>zero</p><p><strong>first</strong></p><p>second</p>`);
        expect(wrapper.firstChild).toBe(firstParagraph);
        expect(wrapper.lastChild).toBe(lastParagraph);
    });

    test("Should undo and redo a backspace in the middle of text", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Backspace")});
        expectHtml(wrapper.innerHTML, `<p class="start">zro</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        const selection = window.getSelection() as Selection;
        expect(selection.getRangeAt(0).startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(selection.getRangeAt(0).startOffset).toBe("ze".length);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p class="start">zro</p>`);
    });

    test("Should undo and redo a delete in the middle of text", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Delete")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeo</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p class="start">zeo</p>`);
    });

    test("Should undo and redo a typed character in the middle of text", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("x")});
        expectHtml(wrapper.innerHTML, `<p class="start">zexro</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        const selection = window.getSelection() as Selection;
        expect(selection.getRangeAt(0).startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(selection.getRangeAt(0).startOffset).toBe("ze".length);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p class="start">zexro</p>`);
    });

    test("Should undo and redo typing over a selection inside one paragraph", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "z".length, "zer".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("x")});
        expectHtml(wrapper.innerHTML, `<p class="start">zxo</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        history.redo();
        expectHtml(wrapper.innerHTML, `<p class="start">zxo</p>`);
    });

    test("Should undo a backspace that deletes the last character of an inline tag", () => {
        const wrapper = createWrapper(`<p>ze<strong class="s">r</strong>tail</p>`);
        const history = new History(wrapper);

        select(wrapper, ".s", "r".length, "r".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Backspace")});
        expectHtml(wrapper.innerHTML, `<p>zetail</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p>ze<strong class="s">r</strong>tail</p>`);
    });

    test("Should undo a backspace that deletes the last character of a paragraph", () => {
        const wrapper = createWrapper(`<p class="start">a</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "a".length, "a".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Backspace")});
        expectHtml(wrapper.innerHTML, `<p class="start"><br></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">a</p>`);
    });

    test("Should undo a backspace that removes a line break", () => {
        const wrapper = createWrapper(`<p class="start">a<br>b</p>`);
        const history = new History(wrapper);

        const range = new Range();
        const lastText = (wrapper.querySelector(".start") as HTMLElement).lastChild as Node;
        range.setStart(lastText, 0);
        range.setEnd(lastText, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        command(wrapper, {action: Action.Keyboard, event: keydownEvent("Backspace")});
        expectHtml(wrapper.innerHTML, `<p>ab</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">a<br>b</p>`);
    });

    test("Should undo each typed character as a separate entry", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeroa</p>`);

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeroab</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zeroa</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should type a character and handle Ctrl+z, Ctrl+y, Ctrl+z", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("x")});
        expectHtml(wrapper.innerHTML, `<p class="start">zexro</p>`);

        wrapper.dispatchEvent(keydownEvent("z", {ctrlKey: true}));
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);

        wrapper.dispatchEvent(keydownEvent("y", {ctrlKey: true}));
        expectHtml(wrapper.innerHTML, `<p class="start">zexro</p>`);

        wrapper.dispatchEvent(keydownEvent("z", {ctrlKey: true}));
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo a tag command that merges adjacent text nodes when unwrapping", () => {
        const wrapper = createWrapper(`<p>ze<strong class="s">ro</strong></p>`);
        const history = new History(wrapper);

        const strongText = getFirstChild(wrapper, ".s");
        const range = new Range();
        range.setStart(strongText, "".length);
        range.setEnd(strongText, "ro".length);
        (getRange as jest.Mock).mockReturnValue(range);

        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p>zero</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p>ze<strong class="s">ro</strong></p>`);
    });

    test("Should not add an entry for a tag command that only leaves a carrier", () => {
        const wrapper = createWrapper(`<p><strong class="s">bold</strong></p>`);
        const history = new History(wrapper);

        select(wrapper, ".s", "bo".length, "bo".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>bo</strong><strong>ld</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p><strong>bo</strong><strong>ld</strong></p>`);
    });

    test("Should fold a carrier into the previous entry instead of stranding it", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        select(wrapper, "strong", "ze".length, "ze".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>ze</strong><strong>ro</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
        expect(wrapper.querySelectorAll("p").length).toBe(1);
    });

    test("Should revert changes", () => {
        const wrapper = createWrapper(`<p><strong class="start">zero</strong></p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>ze</strong><strong>ro</strong></p>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("p")?.childNodes[1] as Node, 0);
        range.setEnd(wrapper.querySelector("p")?.childNodes[1] as Node, 0);
        (getRange as jest.Mock).mockReturnValue(range);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});
        expectHtml(wrapper.innerHTML, `<p><strong>ze</strong>a<strong>ro</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p><strong class="start">zero</strong></p>`);
        expect(wrapper.querySelectorAll("p").length).toBe(1);

        history.redo();

        expectHtml(wrapper.innerHTML, `<p><strong>ze</strong>a<strong>ro</strong></p>`);
    });

    test("Should not add an entry for a click that drops the carrier", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "ze".length, "ze".length);
        selectCursor(command(wrapper, {action: Action.Tag, tag: "STRONG"}));

        command(wrapper, {action: Action.Click, event: new MouseEvent("click")});
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should not add an entry for an arrow key that drops the carrier", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "ze".length, "ze".length);
        selectCursor(command(wrapper, {action: Action.Tag, tag: "STRONG"}));

        command(wrapper, {action: Action.Keyboard, event: keydownEvent("ArrowRight")});
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should not add an entry for an arrow key whose default TableCursor already prevented", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "ze".length, "ze".length);
        selectCursor(command(wrapper, {action: Action.Tag, tag: "STRONG"}));

        // TableCursor takes over the arrows that step across a table edge and prevents the browser's own
        // move. That is still only a cursor move, so it must not read as an edit.
        const event = keydownEvent("ArrowLeft", {cancelable: true});
        event.preventDefault();
        command(wrapper, {action: Action.Keyboard, event});
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should keep the entry for a character typed into the carrier", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "ze".length, "ze".length);
        selectCursor(command(wrapper, {action: Action.Tag, tag: "STRONG"}));

        command(wrapper, {action: Action.Keyboard, event: keydownEvent("x")});
        expectHtml(wrapper.innerHTML, `<p><strong>ze</strong>x<strong>ro</strong></p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p><strong>ze</strong><strong>ro</strong></p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo an inserted table together with the split it made", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.InsertTable, size: {rows: 2, columns: 1}});
        expectHtml(wrapper.innerHTML, `
            <p class="start">ze</p>
            <table><thead><tr><th></th></tr></thead><tbody><tr><td></td></tr></tbody></table>
            <p>ro</p>
        `);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo an inserted table together with the list it split", () => {
        const wrapper = createWrapper(`<ul><li>zero</li><li class="start">first</li></ul>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "".length);
        command(wrapper, {action: Action.InsertTable, size: {rows: 1, columns: 1}});
        expectHtml(wrapper.innerHTML, `
            <ul><li>zero</li></ul>
            <table><thead><tr><th></th></tr></thead></table>
            <ul><li>first</li></ul>
        `);

        history.undo();

        expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li class="start">first</li></ul>`);
    });

    test("Should undo and redo an image inserted once its file has been read", async () => {
        // The FileReader the image command uses is driven by the environment, so this one test runs on its clock.
        jest.useRealTimers();
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        execCommand(wrapper, {action: Action.Image, attributes: {image: new Blob(["image"], {type: "image/png"})}});
        await waitForImage(wrapper);

        expect(wrapper.querySelector("img")).not.toBeNull();

        history.undo();
        expect(wrapper.querySelector("img")).toBeNull();

        history.redo();
        expect(wrapper.querySelector("img")).not.toBeNull();
    });
});

describe("History grouping", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        Carrier.removeCarrier();
    });
    afterEach(() => jest.useRealTimers());

    test("Should undo two characters typed inside the window as one entry", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        jest.advanceTimersByTime(GROUP_INTERVAL - 100);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeroab</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
        expect(history.canUndo()).toBe(false);
    });

    test("Should redo a group as the one entry it was undone as", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});
        history.undo();

        history.redo();

        expectHtml(wrapper.innerHTML, `<p class="start">zeroab</p>`);
        expect(history.canRedo()).toBe(false);
    });

    test("Should close the window on time instead of holding it open with each command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        jest.advanceTimersByTime(200);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});

        select(wrapper, ".start", "zeroab".length, "zeroab".length);
        jest.advanceTimersByTime(200);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("c")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeroabc</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zeroab</p>`);

        history.undo();
        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should group a toolbar command with the keystroke before it", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});

        select(wrapper, ".start", "".length, "zeroa".length);
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>zeroa</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
        expect(history.canUndo()).toBe(false);
    });

    test("Should restore the cursor of the command that opened the group", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "ze".length, "ze".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("x")});

        select(wrapper, ".start", "zex".length, "zex".length);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("y")});
        expectHtml(wrapper.innerHTML, `<p class="start">zexyro</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
        const selection = window.getSelection() as Selection;
        expect(selection.getRangeAt(0).startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(selection.getRangeAt(0).startOffset).toBe("ze".length);
    });

    test("Should open a new entry for a command that follows an undo", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});
        history.undo();

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("c")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeroac</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zeroa</p>`);
    });

    test("Should open a new entry for a command that follows a redo", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});
        history.undo();
        history.redo();

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});
        expectHtml(wrapper.innerHTML, `<p class="start">zeroab</p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zeroa</p>`);
    });

    test("Should notify without adding an entry when a command joins the group", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);
        const listener = jest.fn();
        history.onChange(listener);

        select(wrapper, ".start", "zero".length, "zero".length);
        command(wrapper, {action: Action.Keyboard, event: keydownEvent("a")});

        select(wrapper, ".start", "zeroa".length, "zeroa".length);
        execCommand(wrapper, {action: Action.Keyboard, event: keydownEvent("b")});

        expect(listener).toHaveBeenCalledTimes(2);
        expect(history.canUndo()).toBe(true);

        history.undo();
        expect(history.canUndo()).toBe(false);
    });
});

describe("History stack state", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        Carrier.removeCarrier();
    });
    afterEach(() => jest.useRealTimers());

    test("Should report both stacks empty before anything is recorded", () => {
        const history = new History(createWrapper(`<p class="start">zero</p>`));

        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(false);
    });

    test("Should report an undoable command and nothing to redo", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
    });

    test("Should move the entry between the stacks as it is undone and redone", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        history.undo();
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(true);

        history.redo();
        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
    });

    test("Should drop the redo stack when a new command is recorded after an undo", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        history.undo();
        expect(history.canRedo()).toBe(true);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.FirstLevel, tag: "H1"});

        expect(history.canRedo()).toBe(false);
    });

    test("Should notify on a recorded command, on undo and on redo", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);
        const listener = jest.fn();
        history.onChange(listener);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});
        expect(listener).toHaveBeenCalledTimes(1);

        history.undo();
        expect(listener).toHaveBeenCalledTimes(2);

        history.redo();
        expect(listener).toHaveBeenCalledTimes(3);
    });

    test("Should not notify when there is nothing to undo or redo", () => {
        const history = new History(createWrapper(`<p class="start">zero</p>`));
        const listener = jest.fn();
        history.onChange(listener);

        history.undo();
        history.redo();

        expect(listener).not.toHaveBeenCalled();
    });

    test("Should notify every registered listener", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);
        const undoListener = jest.fn();
        const redoListener = jest.fn();
        history.onChange(undoListener);
        history.onChange(redoListener);

        select(wrapper, ".start", "".length, "zero".length);
        command(wrapper, {action: Action.Tag, tag: "STRONG"});

        expect(undoListener).toHaveBeenCalledTimes(1);
        expect(redoListener).toHaveBeenCalledTimes(1);
    });
});
