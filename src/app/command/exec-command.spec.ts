import {getRange} from "@/shared/range-util";
import {unwrap} from "@/command/exec-command";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Unwrap tag", () => {
    test("Should unwrap strong from selection", () => {
        const toUnwrap = document.createElement("div");
        toUnwrap.id = "content";
        toUnwrap.innerHTML = "<p><strong><u><i>bold bolditalic</i>par</u></strong>italic text</p>";
        document.body.appendChild(toUnwrap);

        const range = new Range();
        range.setStart(toUnwrap.querySelector("p > strong > u > i")?.firstChild as Node, "bold ".length);
        range.setEnd(toUnwrap.querySelector("p > strong > u > i")?.firstChild as Node, "bold bolditalic".length);

        (getRange as jest.Mock).mockReturnValue(range);

        unwrap("STRONG", toUnwrap);

        expect(toUnwrap.innerHTML).toBe("<p><strong><i><u>bold </u></i></strong><i><u>bolditalic</u></i><strong><u>par</u></strong>italic text</p>");
    });
});

// describe("Wrap in tag", () => {
//     test("Should wrap selection in italic", () => {
//         const toWrap = document.createElement("div");
//         toWrap.innerHTML = "<strong>bold bolditalic</strong>italic";
//
//         const range = new Range();
//         range.setStart(toWrap.firstChild?.firstChild as Node, 5);
//         range.setEnd(toWrap.lastChild as Node, 4);
//
//         (getRange as jest.Mock).mockReturnValue(range);
//
//         wrap("em");
//
//         expect(toWrap.innerHTML).toBe("<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic");
//     });
// });