import {cleanElementWhitespace} from "@/core/shared/element-util";
import {Normalizer} from "@/core/normalize/normalize";
import {CursorPosition} from "@/core/shared/type/cursor-position";
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

/** Places the mocked cursor from `startContainer` at `startOffset` to `endContainer` at `endOffset`. */
export function selectRange(startContainer: Node, startOffset: number, endContainer: Node, endOffset: number) {
    const range = new Range();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);
    (getRange as jest.Mock).mockReturnValue(range);
}

export function testNormalize(initial: string, result: string) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = replaceSpaces(initial);
    document.body.appendChild(wrapper);

    const range = new Range();
    const firstText = getFirstText(wrapper.firstChild as HTMLElement);
    range.setStart(firstText, "".length);
    const lastText = getLastText(wrapper.lastChild as HTMLElement);
    range.setEnd(lastText, lastText.textContent.length);
    (getRange as jest.Mock).mockReturnValue(range);

    new Normalizer(wrapper).normalize();

    expectHtml(wrapper.innerHTML, result);
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

function getFirstText(node: Node) {
    while (node && node.firstChild && node.nodeType !== Node.TEXT_NODE) {
        node = node.firstChild;
    }

    return node as HTMLElement;
}

function getLastText(node: Node) {
    let currentNode: Node = node;

    while (currentNode.nodeType !== Node.TEXT_NODE) {
        const childNodes = currentNode.childNodes;
        const lastChild = childNodes[childNodes.length - 1];

        if (!lastChild) {
            return currentNode as HTMLElement;
        }

        currentNode = lastChild;
    }

    return currentNode as HTMLElement;
}

function replaceSpaces(html: string) {
    const element = document.createElement("div");
    element.innerHTML = html;
    cleanElementWhitespace(element);
    return element.innerHTML.replaceAll("\n", "");
}

