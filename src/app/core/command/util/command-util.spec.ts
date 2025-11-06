import {changeFirstLevel, mergeLists, unwrap, wrap} from "@/core/command/util/command-util";
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

    test("Should unwrap strong from different li", () => {
        const toUnwrap = document.createElement("div");
        toUnwrap.id = "content";
        toUnwrap.innerHTML = "<ul><li>fi<strong>rst</strong></li><li><strong>sec</strong>ond</li></ul>";
        document.body.appendChild(toUnwrap);

        const range = new Range();
        range.setStart(toUnwrap.querySelectorAll("ul > li")[0]?.querySelector("strong")?.firstChild as Node, "".length);
        range.setEnd(toUnwrap.querySelectorAll("ul > li")[1]?.querySelector("strong")?.firstChild as Node, "sec".length);

        (getRange as jest.Mock).mockReturnValue(range);

        unwrap("STRONG", toUnwrap);

        expect(toUnwrap.innerHTML).toBe("<ul><li>first</li><li>second</li></ul>");
    });
});

describe("Wrap in tag", () => {
    test("Should wrap selection in italic", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>Wri</strong>te text here</p>";

        const range = new Range();
        range.setStart(toWrap.querySelector("p > strong")?.firstChild as Node, "Wri".length);
        range.setEnd(toWrap.querySelector("p")?.lastChild as Node, "te".length);

        (getRange as jest.Mock).mockReturnValue(range);

        wrap("em", toWrap);

        expect(toWrap.innerHTML).toBe("<p><strong>Wri</strong><em>te</em> text here</p>");
    });

    test("Should wrap selection from the different paragraphs in italic", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>Write </p><p><strong>text </strong></p><p>here</p>";

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("p")[0]?.firstChild as Node, "Wri".length);
        range.setEnd(toWrap.querySelectorAll("p")[2]?.firstChild as Node, "he".length);

        (getRange as jest.Mock).mockReturnValue(range);

        wrap("em", toWrap);

        expect(toWrap.innerHTML).toBe("<p>Wri<em>te </em></p><p><strong><em>text </em></strong></p><p><em>he</em>re</p>");
    });

    test("Should wrap selection from different elements in bold", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>Write <strong>text</strong></p>";

        const range = new Range();
        range.setStart(toWrap.querySelector("p")?.firstChild as Node, "Wri".length);
        range.setEnd(toWrap.querySelector("p > strong")?.firstChild as Node, "te".length);

        (getRange as jest.Mock).mockReturnValue(range);

        wrap("strong", toWrap);

        expect(toWrap.innerHTML).toBe("<p>Wri<strong>te text</strong></p>");
    });

    test("Should wrap unordered list in bold", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first<u>under</u><em>test</em></li><li>second</li><li>third</li></ul>";

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("ul > li > u")[0]?.firstChild as Node, "un".length);
        range.setEnd(toWrap.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        wrap("strong", toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>first<u>un</u><strong><u>der</u><em>test</em></strong></li><li><strong>second</strong></li><li><strong>th</strong>ird</li></ul>");
    });

    test("Should wrap unordered list and paragraph in bold", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li></ul><p>second</p>";

        const range = new Range();
        range.setStart(toWrap.querySelector("ul > li")?.firstChild as Node, "fi".length);
        range.setEnd(toWrap.querySelector("p")?.firstChild as Node, "se".length);

        (getRange as jest.Mock).mockReturnValue(range);

        wrap("strong", toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>fi<strong>rst</strong></li></ul><p><strong>se</strong>cond</p>");
    });
});

describe("Change first level", () => {
    const range = new Range();
    (getRange as jest.Mock).mockReturnValue(range);

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
        const container = document.createElement("div");
        container.innerHTML = "<ul><li>Paragraph</li></ul><p>text</p>";

        const toWrap = container.querySelector("p") as HTMLElement;
        changeFirstLevel(["UL", "LI"], toWrap, container);

        expect(container.innerHTML).toBe("<ul><li>Paragraph</li></ul><ul><li>text</li></ul>");
    });

    test("Should change tag from the li to the paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1</li><li>text2</li><li>text3</li></ul>";

        changeFirstLevel(["P"], toWrap.querySelector("ul")?.childNodes[1] as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li></ul><p>text2</p><ul><li>text3</li></ul>");
    });

    test("Should insert unordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><br></p>";

        changeFirstLevel(["UL", "LI"], toWrap.querySelector("p") as HTMLElement, toWrap);

        expect(toWrap.innerHTML).toBe("<ul><li><br></li></ul>");
    });
});

describe("Merge lists", () => {
    test("Should merge lists from different ul", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1</li></ul><ul><li>text2</li></ul><ul><li>text3</li></ul>";

        const lists = [toWrap.querySelectorAll("ul")[1]?.querySelector("li") as HTMLElement];

        mergeLists(toWrap, lists);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li><li>text2</li><li>text3</li></ul>");
    });

    test("Should merge lists from same ul", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1</li><li>text2</li></ul><ul><li>text3</li></ul>";

        const lists = [toWrap.querySelectorAll("ul")[1]?.querySelector("li") as HTMLElement];

        mergeLists(toWrap, lists);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li><li>text2</li><li>text3</li></ul>");
    });
});

