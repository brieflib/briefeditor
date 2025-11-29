import {
    collapseLeaves,
    filterLeafParents,
    getLeafNodes,
    getSameFirstParent,
    removeConsecutiveDuplicates,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {Leaf} from "@/core/normalize/type/leaf";

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

    const node = toTransform.querySelector("em > strong")?.firstChild;
    const leaf = setLeafParents(node as Node, toTransform);

    expect(leaf?.getParents()[leaf?.getParents().length - 1]?.textContent).toBe("bolditalic");
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
        toFind.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toFind.push(createLeaf("second", ["STRONG", "EM", "SPAN"]));
        toFind.push(createLeaf("third", ["EM", "DIV"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[0]?.leaves[1]).toBe(toFind[1]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(2);
    });

    test("Find one STRONG tag and two EM tags", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toFind.push(createLeaf("second", ["EM", "CUSTOM"]));
        toFind.push(createLeaf("third", ["EM", "DIV"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[1]);
        expect(leafGroup[1]?.leaves[1]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(2);
    });

    test("Find one STRONG tag from one element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup.length).toBe(1);
    });

    test("Find three tags from three element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", ["STRONG"]));
        toFind.push(createLeaf("second", ["SPAN"]));
        toFind.push(createLeaf("third", ["STRONG"]));

        const leafGroup = getSameFirstParent(toFind);

        expect(leafGroup[0]?.leaves[0]).toBe(toFind[0]);
        expect(leafGroup[1]?.leaves[0]).toBe(toFind[1]);
        expect(leafGroup[2]?.leaves[0]).toBe(toFind[2]);
        expect(leafGroup.length).toBe(3);
    });

    test("Find empty array and two STRONG tags from three element array", () => {
        const toFind: Leaf[] = [];
        toFind.push(createLeaf("first", []));
        toFind.push(createLeaf("second", ["STRONG"]));
        toFind.push(createLeaf("third", ["STRONG"]));

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
        toCollapse.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toCollapse.push(createLeaf("second", ["EM", "SPAN"]));
        toCollapse.push(createLeaf("third", ["EM", "DIV"]));

        testCollapse(toCollapse, "<strong><em><div><span>first</span></div></em></strong><em><span>second</span><div>third</div></em>");
    });

    test("Should collapse duplicate STRONG and EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG", "EM", "DIV", "SPAN"]));
        toCollapse.push(createLeaf("second", ["STRONG", "EM", "SPAN"]));
        toCollapse.push(createLeaf("third", ["STRONG", "DIV"]));

        testCollapse(toCollapse, "<strong><em><div><span>first</span></div><span>second</span></em><div>third</div></strong>");
    });

    test("Should collapse duplicate STRONG", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first ", ["STRONG"]));
        toCollapse.push(createLeaf("second", ["STRONG"]));

        testCollapse(toCollapse, "<strong>first second</strong>");
    });

    test("Should not collapse", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG"]));
        toCollapse.push(createLeaf("second", ["SPAN"]));
        toCollapse.push(createLeaf("third", ["STRONG"]));

        testCollapse(toCollapse, "<strong>first</strong><span>second</span><strong>third</strong>");
    });

    test("Should not collapse duplicate BR", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push(createLeaf("first", ["STRONG"]));
        toCollapse.push(createLeaf("", ["BR"]));
        toCollapse.push(createLeaf("", ["BR"]));
        toCollapse.push(createLeaf("third", ["STRONG"]));

        testCollapse(toCollapse, "<strong>first</strong><br><br><strong>third</strong>");
    });
});

test("Should remove leaf's parents", () => {
    const element = document.createTextNode("text");
    const leaf = createLeafFromNode(element, ["STRONG", "SPAN", "DELETED"]);

    const filtered = filterLeafParents(leaf, element, ["STRONG", "DELETED"]);
    expect(filtered?.getParents().map(parent => parent.nodeName)).toStrictEqual(["SPAN", "#text"])
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
    expect((collapsed.firstChild as HTMLElement).innerHTML).toBe(result);
}