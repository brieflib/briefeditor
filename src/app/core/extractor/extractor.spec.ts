import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml, getFirstChild, getText} from "@/core/shared/test-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import {extractContents} from "@/core/extractor/extractor";
import {ExtractedContent} from "@/core/extractor/type/extracted-content";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Extract contents", () => {
    test("Should split a single text node and map the paragraph clone", () => {
        const wrapper = createWrapper(`<p>abcdef</p>`);
        const text = getText(wrapper, "abcdef");
        const paragraph = wrapper.querySelector("p") as Node;

        const {fragment, originalByFragmentNode} = extract(wrapper, text, "ab".length, text, "abcd".length);

        expectHtml(read(fragment), `<p>cd</p>`);
        expectHtml(wrapper.innerHTML, `<p>abef</p>`);
        const clone = fragment.firstChild as Node;
        expect(originalByFragmentNode.get(clone)).toBe(paragraph);
        expect(originalByFragmentNode.get(clone.firstChild as Node)).toBe(clone.firstChild);
    });

    test("Should map partly selected nodes to originals and moved nodes to themselves", () => {
        const wrapper = createWrapper(`<p>ab<em>cd</em>ef</p>`);
        const paragraph = wrapper.querySelector("p") as Node;
        const em = wrapper.querySelector("em") as Node;
        const first = getText(wrapper, "ab");
        const last = getText(wrapper, "ef");

        const {fragment, originalByFragmentNode} = extract(wrapper, first, "a".length, last, "e".length);

        expectHtml(read(fragment), `<p>b<em>cd</em>e</p>`);
        expectHtml(wrapper.innerHTML, `<p>af</p>`);
        const clone = fragment.firstChild as Node;
        expect(originalByFragmentNode.get(clone)).toBe(paragraph);
        expect(originalByFragmentNode.get(clone.firstChild as Node)).toBe(first);
        expect(originalByFragmentNode.get(clone.lastChild as Node)).toBe(last);
        // The em is fully selected, so the fragment holds the original itself
        expect(clone.childNodes[1]).toBe(em);
        expect(originalByFragmentNode.get(em)).toBe(em);
    });

    test("Should map clones when the first block has content before the cursor", () => {
        const wrapper = createWrapper(`
            <p><em>xx</em>ab</p>
            <p>cd</p>
        `);
        const [firstParagraph, lastParagraph] = Array.from(wrapper.querySelectorAll("p"));
        const first = getText(wrapper, "ab");
        const last = getText(wrapper, "cd");

        const {fragment, originalByFragmentNode} = extract(wrapper, first, "a".length, last, "c".length);

        expectHtml(read(fragment), `<p>b</p><p>c</p>`);
        expectHtml(wrapper.innerHTML, `<p><em>xx</em>a</p><p>d</p>`);
        const [firstClone, lastClone] = Array.from(fragment.childNodes);
        expect(originalByFragmentNode.get(firstClone as Node)).toBe(firstParagraph);
        expect(originalByFragmentNode.get(firstClone?.firstChild as Node)).toBe(first);
        expect(originalByFragmentNode.get(lastClone as Node)).toBe(lastParagraph);
        expect(originalByFragmentNode.get(lastClone?.firstChild as Node)).toBe(last);
    });

    test("Should map clones when the cursor starts inside an inline tag", () => {
        const wrapper = createWrapper(`
            <p><em>xx</em>ab</p>
            <p>cd</p>
        `);
        const em = wrapper.querySelector("em") as Node;
        const first = getText(wrapper, "xx");
        const moved = getText(wrapper, "ab");

        const {fragment, originalByFragmentNode} = extract(wrapper, first, "x".length, getText(wrapper, "cd"), "c".length);

        expectHtml(read(fragment), `<p><em>x</em>ab</p><p>c</p>`);
        expectHtml(wrapper.innerHTML, `<p><em>x</em></p><p>d</p>`);
        const emClone = fragment.firstChild?.firstChild as Node;
        expect(originalByFragmentNode.get(emClone)).toBe(em);
        expect(originalByFragmentNode.get(emClone.firstChild as Node)).toBe(first);
        expect(originalByFragmentNode.get(moved)).toBe(moved);
    });

    test("Should map a whole block between the selected ones to its original", () => {
        const wrapper = createWrapper(`
            <p>ab</p>
            <p>mid</p>
            <p>cd</p>
        `);
        const middle = wrapper.querySelectorAll("p")[1] as Node;
        const middleText = getText(wrapper, "mid");

        const {fragment, originalByFragmentNode} = extract(wrapper, getText(wrapper, "ab"), "a".length, getText(wrapper, "cd"), "c".length);

        expectHtml(read(fragment), `<p>b</p><p>mid</p><p>c</p>`);
        expectHtml(wrapper.innerHTML, `<p>a</p><p></p><p>d</p>`);
        const middleClone = fragment.childNodes[1] as Node;
        expect(originalByFragmentNode.get(middleClone)).toBe(middle);
        expect(middleClone.firstChild).toBe(middleText);
        expect(originalByFragmentNode.get(middleText)).toBe(middleText);
    });

    test("Should map nested list clones to their originals", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zer<em>o</em>
                    <ul>
                        <li>first</li>
                        <li class="end">third</li>
                        <li>fourth</li>
                    </ul>
                </li>
                <li>fifth</li>
            </ul>
        `);
        const outerList = wrapper.querySelector("ul") as Node;
        const startItem = wrapper.querySelector(".start") as Node;
        const innerList = wrapper.querySelector("ul ul") as Node;
        const endItem = wrapper.querySelector(".end") as Node;

        const {fragment, originalByFragmentNode} = extract(wrapper,
            getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "th".length);

        expectHtml(read(fragment), `
            <ul>
                <li class="start">r<em>o</em>
                    <ul>
                        <li>first</li>
                        <li class="end">th</li>
                    </ul>
                </li>
            </ul>
        `);
        const outerClone = fragment.firstChild as Node;
        const startClone = outerClone.firstChild as Node;
        const innerClone = startClone.lastChild as Node;
        expect(originalByFragmentNode.get(outerClone)).toBe(outerList);
        expect(originalByFragmentNode.get(startClone)).toBe(startItem);
        expect(originalByFragmentNode.get(innerClone)).toBe(innerList);
        expect(originalByFragmentNode.get(innerClone.lastChild as Node)).toBe(endItem);
    });

    test("Should return an empty fragment when the cursor is collapsed", () => {
        const wrapper = createWrapper(`<p>abcd</p>`);
        const text = getText(wrapper, "abcd");

        const {fragment, originalByFragmentNode} = extract(wrapper, text, "ab".length, text, "ab".length);

        expect(fragment.childNodes.length).toBe(0);
        expect(originalByFragmentNode.size).toBe(0);
        expectHtml(wrapper.innerHTML, `<p>abcd</p>`);
    });
});

function extract(wrapper: HTMLElement, startContainer: Node, startOffset: number, endContainer: Node, endOffset: number): ExtractedContent {
    const range = new Range();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);
    (getRange as jest.Mock).mockReturnValue(range);

    return extractContents(wrapper, getCursorPosition());
}

function read(fragment: DocumentFragment) {
    const container = document.createElement("div");
    container.append(fragment.cloneNode(true));

    return container.innerHTML;
}
