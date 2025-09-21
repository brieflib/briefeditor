import {
    collapseLeaves,
    setLeafParents,
    getLeavesWithTheSameFirstParent,
    sortLeafParents, filterLeafParents, getLeafNodes
} from "@/normalize/util/util";
import {Leaf} from "@/normalize/type/leaf";

test("Should find all leaves", () => {
    const toTransform = document.createElement("div");
    toTransform.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

    const leaves = getLeafNodes(toTransform);

    expect(leaves[0]?.textContent).toBe("bold ");
    expect(leaves[1]?.textContent).toBe("bolditalic");
    expect(leaves[2]?.textContent).toBe("ital");
    expect(leaves[3]?.textContent).toBe("ic");
});

test("Should find all leaf's parents", () => {
    const toTransform = document.createElement("div");
    toTransform.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

    const node = toTransform.childNodes[1]?.firstChild?.firstChild;
    const leaf = setLeafParents(node, toTransform, new Leaf(node));

    expect(leaf?.getText()).toBe("bolditalic");
    expect(leaf?.getParents().map(parent => parent.nodeName)).toStrictEqual(["STRONG", "EM"]);
});

test("Should sort tags", () => {
    const leaf = createLeaf("", ["STRONG", "STRONG", "UL", "LI", "EM", "SPAN"]);

    const sorted = sortLeafParents(leaf);

    expect(sorted.getParents().map(parent => parent.nodeName)).toStrictEqual(["UL", "LI", "STRONG", "EM", "SPAN"]);
});

describe("Find leaves with same first parent", () => {
    test("Find two STRONG tags", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toFind.push(createLeaf("second", ["STRONG", "EM", "SPAN"]));
        toFind.push(createLeaf("third", ["EM", "DIV"]));

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves[1]).toBe(toFind[1]);
        expect(leaves.length).toBe(2);
    });

    test("Find all tags", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toFind.push(createLeaf("second", ["EM", "CUSTOM"]));
        toFind.push(createLeaf("third", ["EM", "DIV"]));

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves.length).toBe(1);
    });

    test("Find one STRONG tag from one element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves.length).toBe(1);
    });

    test("Find one STRONG tag from three element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG"]));
        toFind.push(createLeaf("second", ["SPAN"]));
        toFind.push(createLeaf("third", ["STRONG"]));

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves.length).toBe(1);
    });
});

describe("Should collapse duplicate tags", () => {
    test("Should collapse duplicate EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toCollapse.push(createLeaf("second", ["EM", "SPAN"]));
        toCollapse.push(createLeaf("third", ["EM", "DIV"]));

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong><em><div><span>first</span></div></em></strong><em><span>second</span><div>third</div></em>");
    });

    test("Should collapse duplicate STRONG and EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toCollapse.push(createLeaf("second", ["STRONG", "EM", "SPAN"]));
        toCollapse.push(createLeaf("third", ["STRONG", "DIV"]));

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong><em><div><span>first</span></div><span>second</span></em><div>third</div></strong>");
    });

    test("Should collapse duplicate STRONG", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first ", ["STRONG"]));
        toCollapse.push(createLeaf("second", ["STRONG"]));

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong>first second</strong>");
    });

    test("Should not collapse", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG"]));
        toCollapse.push(createLeaf("second", ["SPAN"]));
        toCollapse.push(createLeaf("third", ["STRONG"]));

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong>first</strong><span>second</span><strong>third</strong>");
    });

    test("Should not collapse duplicate BR", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG"]));
        toCollapse.push(createLeaf("", ["BR"]));
        toCollapse.push(createLeaf("", ["BR"]));
        toCollapse.push(createLeaf("third", ["STRONG"]));

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong>first</strong><br><br><strong>third</strong>");
    });
});

test("Should remove leaf's parents", () => {
    const element = document.createTextNode("text");
    const leaf = createLeafFromNode(element, ["STRONG", "SPAN", "DELETED"]);

    const filtered = filterLeafParents(leaf, element, ["STRONG", "DELETED"]);
    expect(filtered?.getParents().map(parent => parent.nodeName)).toStrictEqual(["SPAN"])
});

function createLeaf(text: string, nodeNames: string[]) {
    const elements: HTMLElement[] = [];

    for (const nodeName of nodeNames) {
        elements.push(document.createElement(nodeName));
    }

    const element = document.createTextNode(text);
    return new Leaf(element, elements);
}

function createLeafFromNode(element: Node, nodeNames: string[]) {
    const elements: HTMLElement[] = [];

    for (const nodeName of nodeNames) {
        elements.push(document.createElement(nodeName));
    }

    return new Leaf(element, elements);
}