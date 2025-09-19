// import {getRange} from "@/command/util/util";
//
// jest.mock("../util/util", () => ({
//         getRange: jest.fn()
//     })
// );

describe("Wrap in tag", () => {
    test("Should wrap selection in italic", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<strong>bold bolditalic</strong>italic";

        let range = new Range();
        range.setStart(toWrap.firstChild!.firstChild as Node, 5);
        range.setEnd(toWrap.lastChild as Node, 4);

        // (getRange as jest.Mock).mockReturnValue(range);
        //
        // wrap("em");
        //
        // expect(toWrap.innerHTML).toBe("<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic");
    });
});