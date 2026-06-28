import {getRange} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {History} from "@/core/history/history";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

function select(wrapper: HTMLElement, selector: string, start: number, end: number) {
    const range = new Range();
    range.setStart(getFirstChild(wrapper, selector), start);
    range.setEnd(getFirstChild(wrapper, selector), end);
    (getRange as jest.Mock).mockReturnValue(range);
}

describe("History undo/redo", () => {
    test("Should undo a tag command and restore the original markup", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});
        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should redo a previously undone tag command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});
        history.undo();

        history.redo();

        expectHtml(wrapper.innerHTML, `<p><strong>zero</strong></p>`);
    });

    test("Should undo a first level command", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});
        expectHtml(wrapper.innerHTML, `<h1>zero</h1>`);

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });

    test("Should undo commands one by one in reverse order", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        select(wrapper, "strong", "".length, "zero".length);
        execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});
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
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});
        history.undo();

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.FirstLevel, tag: "H1"});

        history.redo();

        expectHtml(wrapper.innerHTML, `<h1>zero</h1>`);
    });

    test("Should survive repeated undo/redo cycles", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const history = new History(wrapper);

        select(wrapper, ".start", "".length, "zero".length);
        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

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
        execCommand(wrapper, {action: Action.Attribute, tag: "P", attributes: {class: "changed"}});
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
        execCommand(wrapper, {action: Action.Attribute, tag: "P"});

        history.undo();

        expectHtml(wrapper.innerHTML, `<p class="start">zero</p>`);
    });
});
