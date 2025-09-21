import {getSelectedLeaves, getSharedTags} from "@/shared/selected-tags-util";
import {getRange} from "@/shared/range-util";

jest.mock("./range-util", () => ({
        getRange: jest.fn()
    })
);

test("Should find shared parents", () => {
    const toFindFrom = document.createElement("div");
    toFindFrom.innerHTML = "<p><em>ital<strong>bolditalic</strong></em><strong>bold </strong>ic</p>";
    document.body.appendChild(toFindFrom);

    const range = new Range();
    range.setStart(toFindFrom.querySelector("p > em > strong")?.firstChild as Node, "bold".length);
    range.setEnd(toFindFrom.querySelector("p > strong")?.firstChild as Node, "bo".length);

    (getRange as jest.Mock).mockReturnValue(range);

    const shared = getSharedTags(toFindFrom);

    expect(shared).toStrictEqual(["STRONG", "P"]);
});

test("Should find shared parents from single element", () => {
    const toFindFrom = document.createElement("div");
    toFindFrom.innerHTML = "<p><em>ital<strong>bolditalic</strong></em><strong>bold </strong>ic</p>";
    document.body.appendChild(toFindFrom);

    const range = new Range();
    range.setStart(toFindFrom.querySelector("p > em > strong")?.firstChild as Node, "bo".length);
    range.setEnd(toFindFrom.querySelector("p > em > strong")?.firstChild as Node, "bold".length);

    (getRange as jest.Mock).mockReturnValue(range);

    const shared = getSharedTags(toFindFrom);

    expect(shared).toStrictEqual(["STRONG", "EM", "P"]);
});

test("Should find selected leaf nodes", () => {
    const toFind = document.createElement("div");
    toFind.innerHTML = "<p><em>ital<strong>bolditalic</strong></em><strong>bold </strong>ic</p>";
    document.body.appendChild(toFind);

    const range = new Range();
    const start = toFind.querySelector("p > em > strong")?.firstChild;
    range.setStart(start as Node, "bold".length);
    const end = toFind.querySelector("p > strong")?.firstChild;
    range.setEnd(end as Node, "bo".length);

    (getRange as jest.Mock).mockReturnValue(range);

    const leaves = getSelectedLeaves();

    expect(leaves).toStrictEqual([start, end]);
});