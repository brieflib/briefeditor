import {getSelectedLeaves, getSharedTags} from "@/shared/selected-tags-util";
import {getRange} from "@/shared/range-util";

jest.mock("./range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Shared tags", () => {
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

    test("Should find shared parents when selecting start of the next text", () => {
        const toFindFrom = document.createElement("div");
        toFindFrom.innerHTML = "<p><strong>Write</strong>text here</p>";
        document.body.appendChild(toFindFrom);

        const range = new Range();
        range.setStart(toFindFrom.querySelector("p > strong")?.firstChild as Node, 0);
        range.setEnd(toFindFrom.querySelector("p")?.lastChild as Node, 0);

        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSharedTags(toFindFrom);

        expect(shared).toStrictEqual(["STRONG", "P"]);
    });

    test("Should find shared parents when selecting end of the previous text", () => {
        const toFindFrom = document.createElement("div");
        toFindFrom.innerHTML = "<p>Write text <strong>here</strong></p>";
        document.body.appendChild(toFindFrom);

        const range = new Range();
        range.setStart(toFindFrom.querySelector("p")?.firstChild as Node, "Write text ".length);
        range.setEnd(toFindFrom.querySelector("p > strong")?.firstChild as Node, "here".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSharedTags(toFindFrom);

        expect(shared).toStrictEqual(["STRONG", "P"]);
    });
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