import {collapseLeaves, findLeafParents, findLeaves, getLeavesWithTheSameFirstParent, sortTags} from "@/normalize/util/util";
import {Leaf} from "@/normalize/type/leaf";

test("Should find all leaves", () => {
    const toTransform = document.createElement("div");
    toTransform.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

    const leaves = findLeaves(toTransform);

    expect(leaves[0]!.textContent).toBe("bold ");
    expect(leaves[1]!.textContent).toBe("bolditalic");
    expect(leaves[2]!.textContent).toBe("ital");
    expect(leaves[3]!.textContent).toBe("ic");
});

test("Should find all leaf's parents", () => {
    const toTransform = document.createElement("div");
    toTransform.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

    const leaf = findLeafParents(toTransform.childNodes[1]!.firstChild!.firstChild!, toTransform);

    expect(leaf.text).toBe("bolditalic");
    expect(leaf.parents).toStrictEqual(["STRONG", "EM"]);
});

test("Should sort tags", () => {
    const tags = ["STRONG", "STRONG", "UL", "LI", "EM", "SPAN"];

    const sorted = sortTags(tags);

    expect(sorted).toStrictEqual(["UL", "LI", "STRONG", "EM", "SPAN"]);
});

describe("Find leaves with same first parent", () => {
    test("Find two STRONG tags", () => {
        const toFind: Leaf[] = [];
        toFind.push({text: "first", parents: ["STRONG", "EM", "DIV", "SPAN"]});
        toFind.push({text: "second", parents: ["STRONG", "EM", "SPAN"]});
        toFind.push({text: "third", parents: ["EM", "DIV"]});

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves[1]).toBe(toFind[1]);
        expect(leaves.length).toBe(2);
    });

    test("Find all tags", () => {
        const toFind: Leaf[] = [];
        toFind.push({text: "first", parents: ["STRONG", "EM", "DIV", "SPAN"]});
        toFind.push({text: "second", parents: ["EM", "CUSTOM"]});
        toFind.push({text: "third", parents: ["EM", "DIV"]});

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves.length).toBe(1);
    });

    test("Find one STRONG tag from one element array", () => {
        const toFind: Leaf[] = [];
        toFind.push({text: "first", parents: ["STRONG", "EM", "DIV", "SPAN"]});

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves.length).toBe(1);
    });

    test("Find one STRONG tag from three element array", () => {
        const toFind: Leaf[] = [];
        toFind.push({text: "first", parents: ["STRONG"]});
        toFind.push({text: "second", parents: ["SPAN"]});
        toFind.push({text: "third", parents: ["STRONG"]});

        const leaves = getLeavesWithTheSameFirstParent(toFind);

        expect(leaves[0]).toBe(toFind[0]);
        expect(leaves.length).toBe(1);
    });
});

describe("Should collapse duplicate tags", () => {
    test("Should collapse duplicate EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push({text: "first", parents: ["STRONG", "EM", "DIV", "SPAN"]});
        toCollapse.push({text: "second", parents: ["EM", "SPAN"]});
        toCollapse.push({text: "third", parents: ["EM", "DIV"]});

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong><em><div><span>first</span></div></em></strong><em><span>second</span><div>third</div></em>");
    });

    test("Should collapse duplicate STRONG and EM tags", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push({text: "first", parents: ["STRONG", "EM", "DIV", "SPAN"]});
        toCollapse.push({text: "second", parents: ["STRONG", "EM", "SPAN"]});
        toCollapse.push({text: "third", parents: ["STRONG", "DIV"]});

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong><em><div><span>first</span></div><span>second</span></em><div>third</div></strong>");
    });

    test("Should collapse duplicate STRONG", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push({text: "first ", parents: ["STRONG"]});
        toCollapse.push({text: "second", parents: ["STRONG"]});

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong>first second</strong>");
    });

    test("Should not collapse", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push({text: "first", parents: ["STRONG"]});
        toCollapse.push({text: "second", parents: ["SPAN"]});
        toCollapse.push({text: "third", parents: ["STRONG"]});

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong>first</strong><span>second</span><strong>third</strong>");
    });

    test("Should not collapse duplicate BR", () => {
        const toCollapse: Leaf[] = [];
        toCollapse.push({text: "first", parents: ["STRONG"]});
        toCollapse.push({text: "", parents: ["BR"]});
        toCollapse.push({text: "", parents: ["BR"]});
        toCollapse.push({text: "third", parents: ["STRONG"]});

        const collapsed = collapseLeaves(toCollapse) as HTMLElement;

        expect(collapsed.innerHTML).toBe("<strong>first</strong><br><br><strong>third</strong>");
    });
});