import {changeFirstLevel, unwrap, wrap} from "@/core/command/util/util";
import {getRange} from "@/core/shared/range-util";

jest.mock("../../shared/range-util", () => ({
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
        range.setEnd(toUnwrap.querySelector("p > strong > u")?.lastChild as Node, "pa".length);

        (getRange as jest.Mock).mockReturnValue(range);

        unwrap("STRONG", toUnwrap);

        expect(toUnwrap.innerHTML).toBe("<p><strong><i><u>bold </u></i></strong><i><u>bolditalic</u></i><u>pa</u><strong><u>r</u></strong>italic text</p>");
    });
});

describe("Wrap in tag", () => {
    test("Should wrap selection in italic", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>Wri</strong>te text here</p>";

        const range = new Range();
        range.setStart(toWrap.querySelector("p > strong")?.firstChild as Node, "Wri".length);
        range.setEnd(toWrap.querySelector("p")?.lastChild as Node, "to".length);

        (getRange as jest.Mock).mockReturnValue(range);

        wrap("em", toWrap);

        expect(toWrap.innerHTML).toBe("<p><strong>Wri</strong><em>te</em> text here</p>");
    });
});

describe("Change first level", () => {
    test("Should change paragraph to heading", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>Paragraph</p>";

        changeFirstLevel("H1", toWrap.querySelector("p") as HTMLElement);

        expect(toWrap.innerHTML).toBe("<h1>Paragraph</h1>");
    });

    test("Should change text to heading", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "Paragraph";

        changeFirstLevel("H1", toWrap.firstChild as HTMLElement);

        expect(toWrap.innerHTML).toBe("<h1>Paragraph</h1>");
    });

    test("Should wrap strong in heading", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<strong>Paragraph</strong>";

        changeFirstLevel("H1", toWrap.querySelector("strong") as HTMLElement, true);

        expect(toWrap.innerHTML).toBe("<h1><strong>Paragraph</strong></h1>");
    });
});