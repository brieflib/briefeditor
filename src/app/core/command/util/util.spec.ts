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

        expect(toUnwrap.innerHTML).toBe("<p><strong><u><i>bold </i></u></strong><u><i>bolditalic</i>pa</u><strong><u>r</u></strong>italic text</p>");
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

        changeFirstLevel(["H1"], toWrap.querySelector("p") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<h1>Paragraph</h1>");
    });

    test("Should change text to heading", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "Paragraph";

        changeFirstLevel(["H1"], toWrap.firstChild as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<h1>Paragraph</h1>");
    });

    test("Should change text to ordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "Paragraph";

        changeFirstLevel(["UL", "LI"], toWrap.firstChild as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>Paragraph</li></ul>");
    });

    test("Should wrap strong in heading", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>Paragraph</strong></p>";

        changeFirstLevel(["H1"], toWrap.querySelector("p") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<h1><strong>Paragraph</strong></h1>");
    });

    test("Should wrap strong in unordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>Paragraph</strong></p>";

        const range = new Range();
        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(["UL", "LI"], toWrap.querySelector("p") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li><strong>Paragraph</strong></li></ul>");
    });

    test("Should unwrap list to paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1<ul><li><strong>text2</strong></li></ul></li></ul>";

        changeFirstLevel(["P"], toWrap.querySelector("ul > li > ul > li") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li></ul><p><strong>text2</strong></p>");
    });

    test("Should change ordered list to paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>Paragraph</li></ul>";

        changeFirstLevel(["P"], toWrap.querySelector("li") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<p>Paragraph</p>");
    });

    test("Should wrap paragraph elements to ordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>Paragraph</li></ul><p>text</p>";

        changeFirstLevel(["UL", "LI"], toWrap.querySelector("p") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>Paragraph</li></ul><ul><li>text</li></ul>");
    });

    test("Should wrap one of the li to paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1</li><li>text2</li><li>text3</li></ul>";

        changeFirstLevel(["P"], toWrap.querySelector("ul")?.childNodes[1] as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li></ul><p>text2</p><ul><li>text3</li></ul>");
    });
});