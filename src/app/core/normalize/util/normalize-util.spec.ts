import {
    anchorCursorOnLeaf,
    collapseLeaves,
    filterLeafParents,
    getLeafNodes,
    getSameFirstParent,
    getTextNodes,
    removeConsecutiveDuplicates,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {Leaf} from "@/core/normalize/type/leaf";
import {createWrapper, expectHtml, getFirstChild, selectRange} from "@/core/shared/test-util";
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {Normalizer} from "@/core/normalize/normalize";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

test("Should find all leaves", () => {
    const wrapper = createWrapper(`
        <strong>zero</strong>
        <em>
            <strong>first</strong>
            second
        </em>
        third
    `);

    const leaves = getLeafNodes(wrapper);

    expect(leaves[0]?.textContent).toBe("zero");
    expect(leaves[1]?.textContent).toBe("first");
    expect(leaves[2]?.textContent).toBe(" second ");
    expect(leaves[3]?.textContent).toBe(" third ");
});

test("Should skip empty text nodes", () => {
    const wrapper = createWrapper(`<p>ab<em>cd</em></p>`);
    wrapper.querySelector("p")?.append(document.createTextNode(""));

    const textNodes = getTextNodes(wrapper);

    expect(textNodes.map(textNode => textNode.textContent)).toEqual(["ab", "cd"]);
});

test("Should find all leaf's parents", () => {
    const wrapper = createWrapper(`
        <strong>zero</strong>
        <em>
            <strong class="start">first</strong>
            second
        </em>
        third
    `);

    const node = getFirstChild(wrapper, ".start");
    const leaf = setLeafParents(wrapper, node as Node);

    expect(leaf?.getParents()[leaf?.getParents().length - 1]?.textContent).toBe("first");
    expect(leaf?.getParents().map(parent => parent.nodeName)).toStrictEqual(["EM", "STRONG", "#text"]);
});

test("Should sort tags", () => {
    const leaf = createLeaf("", ["STRONG", "STRONG", "UL", "LI", "EM", "SPAN"]);

    const sorted = sortLeafParents(leaf);

    expect(sorted.getParents().map(parent => parent.nodeName)).toStrictEqual(["UL", "LI", "STRONG", "STRONG", "EM", "SPAN", "#text"]);
});

test("Should remove consecutive duplicates", () => {
    const leaf = createLeaf("", ["STRONG", "STRONG", "UL", "LI", "EM", "SPAN", "SPAN"]);

    leaf.setParents(removeConsecutiveDuplicates(leaf).getParents());

    expect(leaf.getParents().map(parent => parent.nodeName)).toStrictEqual(["STRONG", "UL", "LI", "EM", "SPAN", "#text"]);
});

describe("Find leaves with same first parent", () => {
    test("Find two STRONG tags and one EM", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("zero", ["STRONG", "EM", "DIV", "SPAN"]));
        toFind.push(createLeaf("first", ["STRONG", "EM", "SPAN"]));
        toFind.push(createLeaf("second", ["EM", "DIV"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[0]?.leaves[1]).toBe(toFind[1]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(2);
    });

    test("Find one STRONG tag and two EM tags", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("zero", ["STRONG", "EM", "DIV", "SPAN"]));
        toFind.push(createLeaf("first", ["EM", "CUSTOM"]));
        toFind.push(createLeaf("second", ["EM", "DIV"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[1]);
        expect(leafGroup[1]?.leaves[1]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(2);
    });

    test("Find one STRONG tag from one element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("zero", ["STRONG", "EM", "DIV", "SPAN"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup.length).toBe(1);
    });

    test("Find three tags from three element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("zero", ["STRONG"]));
        toFind.push(createLeaf("first", ["SPAN"]));
        toFind.push(createLeaf("second", ["STRONG"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[1]);
        expect(leafGroup[2]?.leaves[0]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(3);
    });

    test("Find empty array and two STRONG tags from three element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("zero", []));
        toFind.push(createLeaf("first", ["STRONG"]));
        toFind.push(createLeaf("second", ["STRONG"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[1]);
        expect(leafGroup[1]?.leaves[1]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(2);
    });
});

describe("Should collapse duplicate tags", () => {
    test("Should collapse duplicate EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("zero", ["STRONG", "EM", "DIV", "SPAN"]));
        toCollapse.push(createLeaf("first", ["EM", "SPAN"]));
        toCollapse.push(createLeaf("second", ["EM", "DIV"]));

        testCollapse(toCollapse, `
            <strong>
                <em>
                    <div>
                        <span>zero</span>
                    </div>
                </em>
            </strong>
            <em>
                <span>first</span>
                <div>second</div>
            </em>
        `);
    });

    test("Should collapse duplicate STRONG and EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("zero", ["STRONG", "EM", "DIV", "SPAN"]));
        toCollapse.push(createLeaf("first", ["STRONG", "EM", "SPAN"]));
        toCollapse.push(createLeaf("second", ["STRONG", "DIV"]));

        testCollapse(toCollapse, `
            <strong>
                <em>
                    <div>
                        <span>zero</span>
                    </div>
                    <span>first</span>
                </em>
                <div>second</div>
            </strong>
        `);
    });

    test("Should collapse duplicate STRONG", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("zero ", ["STRONG"]));
        toCollapse.push(createLeaf("first", ["STRONG"]));

        testCollapse(toCollapse, `
            <strong>zero first</strong>
        `);
    });

    test("Should not collapse", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("zero", ["STRONG"]));
        toCollapse.push(createLeaf("first", ["SPAN"]));
        toCollapse.push(createLeaf("second", ["STRONG"]));

        testCollapse(toCollapse, `
            <strong>zero</strong>
            <span>first</span>
            <strong>second</strong>
        `);
    });

    test("Should not collapse duplicate BR", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("zero", ["STRONG"]));
        toCollapse.push(createLeaf("", ["BR"]));
        toCollapse.push(createLeaf("", ["BR"]));
        toCollapse.push(createLeaf("first", ["STRONG"]));

        testCollapse(toCollapse, `
            <strong>zero</strong>
            <br>
            <br>
            <strong>first</strong>
        `);
    });
});

describe("Anchor a cursor on a leaf", () => {
    function cursorOn(container: Node, offset: number) {
        return getCursorPositionFrom(container, offset, container, offset, false);
    }

    test("Should move a cursor on an empty block onto the br standing in for its content", () => {
        const wrapper = createWrapper(`<p class="start"><br></p>`);
        const block = wrapper.querySelector(".start") as HTMLElement;

        const anchored = anchorCursorOnLeaf(cursorOn(block, 0));

        expect(anchored.startContainer).toBe(block.firstChild);
        expect(anchored.startOffset).toBe(0);
        expect(anchored.endContainer).toBe(block.firstChild);
        expect(anchored.endOffset).toBe(0);
    });

    test("Should move a cursor onto the leaf its offset points at", () => {
        const wrapper = createWrapper(`<p class="start">zero<br>first</p>`);
        const block = wrapper.querySelector(".start") as HTMLElement;

        const anchored = anchorCursorOnLeaf(cursorOn(block, 1));

        expect(anchored.startContainer).toBe(block.childNodes[1]);
        expect(anchored.startOffset).toBe(0);
        expect(anchored.endContainer).toBe(block.childNodes[1]);
        expect(anchored.endOffset).toBe(0);
    });

    test("Should move a cursor past the last child onto the end of the last leaf", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const block = wrapper.querySelector(".start") as HTMLElement;

        const anchored = anchorCursorOnLeaf(cursorOn(block, block.childNodes.length));

        expect(anchored.startContainer).toBe(block.firstChild);
        expect(anchored.startOffset).toBe("zero".length);
        expect(anchored.endContainer).toBe(block.firstChild);
        expect(anchored.endOffset).toBe("zero".length);
    });

    test("Should leave a cursor already on a text node alone", () => {
        const wrapper = createWrapper(`<p class="start">zero</p>`);
        const text = getFirstChild(wrapper, ".start");
        const cursorPosition = cursorOn(text, "ze".length);

        const anchored = anchorCursorOnLeaf(cursorPosition);

        expect(anchored).toBe(cursorPosition);
        expect(anchored.startContainer).toBe(text);
        expect(anchored.startOffset).toBe("ze".length);
        expect(anchored.endContainer).toBe(text);
        expect(anchored.endOffset).toBe("ze".length);
    });

    // The browser anchors a caret arriving at the end of an item's line on the item, just before the list
    // nested in it: that is the end of the item's own line, not the start of the nested item's.
    test("Should move a cursor before a nested list onto the end of the line before it", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero<ul><li>first</li></ul></li></ul>`);
        const item = wrapper.querySelector(".start") as HTMLElement;

        const anchored = anchorCursorOnLeaf(cursorOn(item, 1));

        expect(anchored.startContainer).toBe(item.firstChild);
        expect(anchored.startOffset).toBe("zero".length);
        expect(anchored.endContainer).toBe(item.firstChild);
        expect(anchored.endOffset).toBe("zero".length);
    });

    test("Should move a cursor before a list opening the container onto the list's first leaf", () => {
        const wrapper = createWrapper(`<ul><li class="start">zero</li></ul>`);

        const anchored = anchorCursorOnLeaf(cursorOn(wrapper, 0));

        expect(anchored.startContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(anchored.startOffset).toBe(0);
        expect(anchored.endContainer).toBe(getFirstChild(wrapper, ".start"));
        expect(anchored.endOffset).toBe(0);
    });

    // Nothing survives the rebuild to move onto, so there is nowhere better for the cursor to go.
    test("Should leave a cursor on a block with no leaves alone", () => {
        const wrapper = createWrapper(`<p class="start"></p>`);
        const block = wrapper.querySelector(".start") as HTMLElement;
        const cursorPosition = cursorOn(block, 0);

        const anchored = anchorCursorOnLeaf(cursorPosition);

        expect(anchored).toBe(cursorPosition);
        expect(anchored.startContainer).toBe(block);
        expect(anchored.startOffset).toBe(0);
        expect(anchored.endContainer).toBe(block);
        expect(anchored.endOffset).toBe(0);
    });
});

test("Should remove leaf's parents", () => {
    const element = document.createTextNode("text");
    const leaf = createLeafFromNode(element, ["STRONG", "SPAN", "DELETED"]);

    const filtered = filterLeafParents(element, ["STRONG", "DELETED"], leaf);
    expect(filtered?.getParents().map(parent => parent.nodeName)).toStrictEqual(["SPAN", "#text"])
});

describe("Should replace block tags", () => {
    test("Should replace a paragraph with a heading", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong></p>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);

        new Normalizer(wrapper).replaceBlockTags(["H1"]);

        expectHtml(wrapper.innerHTML, `
            <h1>zero<strong>first</strong></h1>
        `);
    });

    test("Should keep separate paragraphs separate", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["H1"]);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
            <h1>first</h1>
        `);
    });

    test("Should divide a replaced line out of the line holding it", () => {
        const wrapper = createWrapper(`
            <blockquote>
                <p class="start">zero</p>
                <p class="end">first</p>
            </blockquote>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["H1"]);

        expectHtml(wrapper.innerHTML, `
            <h1>zero</h1>
            <h1>first</h1>
        `);
    });

    test("Should replace every list item with a block", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li class="end">first</li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p>first</p>
        `);
    });

    test("Should replace only the selected list item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li>second</li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".start"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p>first</p>
            <ul>
                <li>second</li>
            </ul>
        `);
    });

    test("Should change only the wrapper of the selected list item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".start"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["OL"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li>first</li>
            </ol>
        `);
    });

    test("Should keep the nested list of an item whose wrapper is changed", () => {
        const wrapper = createWrapper(`
            <ol>
                <li class="start">zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);

        new Normalizer(wrapper).replaceBlockTags(["UL"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ul>
        `);
    });

    test("Should keep an inline tag around a line break", () => {
        const wrapper = createWrapper(`
            <ul>
                <li><strong class="start">zero<br>first</strong></li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".start"), "ze".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <p><strong>zero<br>first</strong></p>
        `);
    });

    test("Should replace paragraphs with one list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["UL", "LI"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `);
    });

    test("Should leave a leaf of a block that is not selected as is", () => {
        const wrapper = createWrapper(`
            <h2>zero</h2>
            <p class="start">first</p>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".start"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["H1"]);

        expectHtml(wrapper.innerHTML, `
            <h2>zero</h2>
            <h1>first</h1>
        `);
    });

    test("Should divide a replaced inner list item out of the outer list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".start"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p>first</p>
        `);
    });

    test("Should keep the outer items after a divided one in a list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".start"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p>first</p>
            <ul>
                <li>second</li>
            </ul>
        `);
    });

    test("Should leave the outer list of the same type as is", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first</li>
                    </ul>
                </li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".start"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero</li>
            </ul>
            <p>first</p>
        `);
    });

    test("Should replace an outer and an inner list item", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ol>
                        <li class="end">first</li>
                    </ol>
                </li>
            </ul>
        `);
        selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);

        new Normalizer(wrapper).replaceBlockTags(["P"]);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p>first</p>
        `);
    });
});

function createLeaf(text: string, parentNames: string[]) {
    const parents: Node[] = [];

    for (const parentName of parentNames) {
        parents.push(document.createElement(parentName));
    }

    const element = document.createTextNode(text);
    parents.push(element);
    return new Leaf(parents);
}

function createLeafFromNode(element: Node, nodeNames: string[]) {
    const elements: Node[] = [];

    for (const nodeName of nodeNames) {
        elements.push(document.createElement(nodeName));
    }

    elements.push(element);

    return new Leaf(elements);
}

function testCollapse(toCollapse: Leaf[], result: string) {
    const collapsed = collapseLeaves(toCollapse);
    expectHtml((collapsed.firstChild as HTMLElement).innerHTML, result);
}
