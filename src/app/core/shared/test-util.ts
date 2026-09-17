import {cleanElementWhitespace} from "@/core/shared/element-util";
import {normalize} from "@/core/normalize/normalize";
import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";
import {getRange} from "@/core/shared/range-util";

export function createWrapper(html: string) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = replaceSpaces(html);
    document.body.innerHTML = "";
    document.body.appendChild(wrapper);

    return wrapper;
}

export function expectHtml(comparable: string, compareTo: string) {
    expect(replaceSpaces(comparable)).toBe(replaceSpaces(compareTo));
}

export function getFirstChild(wrapper: HTMLElement, querySelector: string) {
    return wrapper.querySelector(querySelector)?.firstChild as Node
}

export function getLastChild(wrapper: HTMLElement, querySelector: string) {
    return wrapper.querySelector(querySelector)?.lastChild as Node
}

/** The first text node under `wrapper` holding exactly `content`. */
export function getText(wrapper: HTMLElement, content: string) {
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.textContent === content) {
            return node;
        }
    }

    throw new Error(`No text node holds "${content}"`);
}

export function testNormalize(initial: string, result: string) {
    const wrapper = document.createElement("div");
    const toNormalize = document.createElement("deleted");
    toNormalize.innerHTML = replaceSpaces(initial);
    wrapper.appendChild(toNormalize);
    document.body.appendChild(wrapper);

    const range = new Range();
    range.setStart(wrapper.firstChild as HTMLElement, "".length);
    range.setEnd(wrapper.lastChild as HTMLElement, "".length);
    (getRange as jest.Mock).mockReturnValue(range);

    const cursorPosition = normalize(wrapper, getCursorPosition());
    expectHtml((wrapper.firstChild as HTMLElement).innerHTML, result);
    // A cursor read on the wrapper's edges is anchored on the first text the rebuild left, or on the
    // first empty element (a cell) when it left none.
    const firstLeaf = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT).nextNode() ??
        document.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT, node => node.hasChildNodes() ?
            NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT).nextNode();
    expectCursor(cursorPosition, firstLeaf, 0);
}

function replaceSpaces(html: string) {
    const element = document.createElement("div");
    element.innerHTML = html;
    cleanElementWhitespace(element);
    return element.innerHTML.replaceAll("\n", "");
}

/** Asserts all four ends of `cursorPosition`; a collapsed cursor names only its start. */
export function expectCursor(cursorPosition: CursorPosition | null | undefined, startContainer: Node | null | undefined,
                             startOffset: number, endContainer: Node | null | undefined = startContainer,
                             endOffset: number = startOffset) {
    expect(cursorPosition?.startContainer).toBe(startContainer);
    expect(cursorPosition?.startOffset).toBe(startOffset);
    expect(cursorPosition?.endContainer).toBe(endContainer);
    expect(cursorPosition?.endOffset).toBe(endOffset);
}
