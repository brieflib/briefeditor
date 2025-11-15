import execCommand from "@/core/command/exec-command";
import {getRange} from "@/core/shared/range-util";
import {Action} from "@/core/command/type/command";
import {getSelectionOffset} from "@/core/cursor/cursor";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

jest.mock("../cursor/cursor", () => ({
        getSelectionOffset: jest.fn(),
        setCursorPosition: jest.fn()
    })
);

test("Should change multiple lists to paragraph", () => {
    const toWrap = document.createElement("div");
    toWrap.innerHTML = "<ul><li>first</li><li>second</li><li>third</li></ul>";

    const range = new Range();
    range.setStart(toWrap.querySelectorAll("ul > li")[0]?.firstChild as Node, "fi".length);
    range.setEnd(toWrap.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);

    (getRange as jest.Mock).mockReturnValue(range);
    (getSelectionOffset as jest.Mock).mockReturnValue({});

    execCommand({action: Action.FirstLevel, tag: ["UL", "LI"]}, toWrap);

    expect(toWrap.innerHTML).toBe("<p>first</p><p>second</p><p>third</p>");
});

test("Should change paragraphs to list", () => {
    const toWrap = document.createElement("div");
    toWrap.innerHTML = "<p>first</p><p>second</p>";

    const range = new Range();
    range.setStart(toWrap.querySelectorAll("p")[0]?.firstChild as Node, "fi".length);
    range.setEnd(toWrap.querySelectorAll("p")[1]?.firstChild as Node, "second".length);

    (getRange as jest.Mock).mockReturnValue(range);
    (getSelectionOffset as jest.Mock).mockReturnValue({});

    execCommand({action: Action.FirstLevel, tag: ["UL", "LI"]}, toWrap);

    expect(toWrap.innerHTML).toBe("<ul><li>first</li><li>second</li></ul>");
});