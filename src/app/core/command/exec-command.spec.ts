import {getRange} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {replaceSpaces} from "@/core/shared/test-util";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Cursor position", () => {
    test("Should apply bold when cursor located at start", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>first</p><p>second</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p:nth-child(1)")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p:nth-child(2)")?.firstChild as Node, "".length);

        (getRange as jest.Mock).mockReturnValue(range);

        execCommand({action: Action.Tag, tag: "STRONG"}, toWrap);

        expect(toWrap.innerHTML).toBe("<p><strong>first</strong></p><p>second</p>");
    });

    test("Should change paragraph to unordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>first</p><p>second</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p:nth-child(1)")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p:nth-child(2)")?.firstChild as Node, "".length);

        (getRange as jest.Mock).mockReturnValue(range);

        execCommand({action: Action.FirstLevel, tag: ["UL", "LI"]}, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>first</li></ul><p>second</p>");
    });

    test("Should change paragraph to unordered list with multiple tags", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>first</strong> second</p><p><strong>third</strong></p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p:nth-child(2) > strong")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p:nth-child(2) > strong")?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        execCommand({action: Action.FirstLevel, tag: ["UL", "LI"]}, toWrap);

        expect(toWrap.innerHTML).toBe("<p><strong>first</strong> second</p><ul><li><strong>third</strong></li></ul>");
    });

    test("Should change ordered list to unordered list when cursor is at start", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first<ol><li>second</li><li>third</li></ol></li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("ul > li > ol > li:nth-child(2)")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("ul > li > ol > li:nth-child(2)")?.firstChild as Node, "".length);

        (getRange as jest.Mock).mockReturnValue(range);

        execCommand({action: Action.FirstLevel, tag: ["UL", "LI"]}, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>first<ol><li>second</li></ol><ul><li>third</li></ul></li></ul>");
    });
});