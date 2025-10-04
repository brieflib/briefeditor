import {GetElementsBetween, getSelectedLeaves} from "@/core/selection/util/util";
import {getRange} from "@/core/shared/range-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

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

test("Should find elements between", () => {
    const toFind = document.createElement("div");
    toFind.innerHTML = "<em>ital</em><strong>bolditalic</strong><strong>bold</strong><u>underline</u>";
    document.body.appendChild(toFind);

    const start = toFind.childNodes[0] || toFind;
    const end = toFind.childNodes[2] || toFind;

    const nodesBetween = GetElementsBetween(start as HTMLElement, end as HTMLElement);

    expect(nodesBetween).toStrictEqual([toFind.childNodes[0], toFind.childNodes[1], toFind.childNodes[2]]);
});