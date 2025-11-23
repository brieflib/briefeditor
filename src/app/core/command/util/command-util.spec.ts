import {changeFirstLevel, changeListWrapper, mergeLists, tag} from "@/core/command/util/command-util";
import {getRange} from "@/core/shared/range-util";
import {Action} from "@/core/command/type/command";

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

        tag("STRONG", toUnwrap, Action.Unwrap);

        expect(toUnwrap.innerHTML).toBe("<p><strong><u><i>bold </i></u></strong><u><i>bolditalic</i>pa</u><strong><u>r</u></strong>italic text</p>");
    });

    test("Should unwrap strong from different li", () => {
        const toUnwrap = document.createElement("div");
        toUnwrap.innerHTML = "<ul><li>fi<strong>rst</strong></li><li><strong>sec</strong>ond</li></ul>";
        document.body.appendChild(toUnwrap);

        const range = new Range();
        range.setStart(toUnwrap.querySelectorAll("ul > li")[0]?.querySelector("strong")?.firstChild as Node, "".length);
        range.setEnd(toUnwrap.querySelectorAll("ul > li")[1]?.querySelector("strong")?.firstChild as Node, "sec".length);

        (getRange as jest.Mock).mockReturnValue(range);

        tag("STRONG", toUnwrap, Action.Unwrap);

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

        tag("em", toWrap, Action.Wrap);

        expect(toWrap.innerHTML).toBe("<p><strong>Wri</strong><em>te</em> text here</p>");
    });

    test("Should wrap selection from the different paragraphs in italic", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>Write </p><p><strong>text </strong></p><p>here</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("p")[0]?.firstChild as Node, "Wri".length);
        range.setEnd(toWrap.querySelectorAll("p")[2]?.firstChild as Node, "he".length);

        (getRange as jest.Mock).mockReturnValue(range);

        tag("em", toWrap, Action.Wrap);

        expect(toWrap.innerHTML).toBe("<p>Wri<em>te </em></p><p><strong><em>text </em></strong></p><p><em>he</em>re</p>");
    });

    test("Should wrap selection from different elements in bold", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>Write <strong>text</strong></p>";

        const range = new Range();
        range.setStart(toWrap.querySelector("p")?.firstChild as Node, "Wri".length);
        range.setEnd(toWrap.querySelector("p > strong")?.firstChild as Node, "te".length);

        (getRange as jest.Mock).mockReturnValue(range);

        tag("strong", toWrap, Action.Wrap);

        expect(toWrap.innerHTML).toBe("<p>Wri<strong>te text</strong></p>");
    });

    test("Should wrap unordered list in bold", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first<u>under</u><em>test</em></li><li>second</li><li>third</li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("ul > li > u")[0]?.firstChild as Node, "un".length);
        range.setEnd(toWrap.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        tag("strong", toWrap, Action.Wrap);

        expect(toWrap.innerHTML).toBe("<ul><li>first<u>un</u><strong><u>der</u><em>test</em></strong></li><li><strong>second</strong></li><li><strong>th</strong>ird</li></ul>");
    });

    test("Should wrap unordered list and paragraph in bold", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li></ul><p>second</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("ul > li")?.firstChild as Node, "fi".length);
        range.setEnd(toWrap.querySelector("p")?.firstChild as Node, "se".length);

        (getRange as jest.Mock).mockReturnValue(range);

        tag("strong", toWrap, Action.Wrap);

        expect(toWrap.innerHTML).toBe("<ul><li>fi<strong>rst</strong></li></ul><p><strong>se</strong>cond</p>");
    });
});

describe("Change first level", () => {
    test("Should change paragraph to heading", () => {
        const container = document.createElement("div");
        container.innerHTML = "<p>Paragraph</p>";
        document.body.appendChild(container);

        const range = new Range();
        range.setStart(container.querySelector("p")?.firstChild as Node, "".length);
        range.setEnd(container.querySelector("p")?.firstChild as Node, "par".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(container, ["H1"]);

        expect(container.innerHTML).toBe("<h1>Paragraph</h1>");
    });

    test("Should wrap strong in heading", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>Paragraph</strong></p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p > strong")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p > strong")?.firstChild as Node, "Par".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["H1"]);

        expect(toWrap.innerHTML).toBe("<h1><strong>Paragraph</strong></h1>");
    });

    test("Should wrap strong in unordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p><strong>Paragraph</strong></p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p > strong")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p > strong")?.firstChild as Node, "Par".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["UL", "LI"]);

        expect(toWrap.innerHTML).toBe("<ul><li><strong>Paragraph</strong></li></ul>");
    });

    test("Should unwrap list to paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1<ul><li><strong>text2</strong></li></ul></li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("ul > li > ul > li > strong")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("ul > li > ul > li > strong")?.firstChild as Node, "te".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["P"]);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li></ul><p><strong>text2</strong></p>");
    });

    test("Should change ordered list to paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>Paragraph</li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("ul > li")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("ul > li")?.firstChild as Node, "Par".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["P"]);

        expect(toWrap.innerHTML).toBe("<p>Paragraph</p>");
    });

    test("Should wrap paragraph elements to ordered list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>Paragraph</li></ul><p>text</p>"
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p")?.firstChild as Node, "te".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["UL", "LI"]);

        expect(toWrap.innerHTML).toBe("<ul><li>Paragraph</li><li>text</li></ul>");
    });

    test("Should change tag from the li to the paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li><li>second</li><li>third</li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("ul > li")[1]?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelectorAll("ul > li")[1]?.firstChild as Node, "sec".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["P"]);

        expect(toWrap.innerHTML).toBe("<ul><li>first</li></ul><p>second</p><ul><li>third</li></ul>");
    });

    // test("Should insert unordered list", () => {
    //     const container = document.createElement("div");
    //     container.innerHTML = "<p><br></p>";
    //     document.body.appendChild(container);
    //
    //     const range = new Range();
    //     range.setStart(container.querySelector("p") as Node, 0);
    //     range.setEnd(container.querySelector("p") as Node, 1);
    //
    //     (getRange as jest.Mock).mockReturnValue(range);
    //
    //     firstLevel(container, ["UL", "LI"]);
    //
    //     expect(container.innerHTML).toBe("<ul><li><br></li></ul>");
    // });

    test("Should change list with br to paragraph", () => {
        const container = document.createElement("div");
        container.innerHTML = "<ul><li>first<br>second</li></ul>";
        document.body.appendChild(container);

        const range = new Range();
        range.setStart(container.querySelector("ul > li")?.firstChild as Node, "".length);
        range.setEnd(container.querySelector("ul > li")?.firstChild as Node, "fi".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(container, ["P"]);

        expect(container.innerHTML).toBe("<p>first<br>second</p>");
    });

    test("Should change paragraph divided by br to list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>first<br>second</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p")?.firstChild as Node, "fi".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["UL", "LI"]);

        expect(toWrap.innerHTML).toBe("<ul><li>first<br>second</li></ul>");
    });

    test("Should change paragraph with strong tag to list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>fir<strong>st se</strong>cond</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("p")?.firstChild as Node, "".length);
        range.setEnd(toWrap.querySelector("p")?.firstChild as Node, "fi".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["UL", "LI"]);

        expect(toWrap.innerHTML).toBe("<ul><li>fir<strong>st se</strong>cond</li></ul>");
    });

    test("Should change multiple lists to paragraph", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li><li>second</li><li>third</li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("ul > li")[0]?.firstChild as Node, "fi".length);
        range.setEnd(toWrap.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["P"]);

        expect(toWrap.innerHTML).toBe("<p>first</p><p>second</p><p>third</p>");
    });

    test("Should change inner unordered list to ordered", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li><ul><li>second</li></ul></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelector("ul > ul > li")?.firstChild as Node, "se".length);
        range.setEnd(toWrap.querySelector("ul > ul > li")?.firstChild as Node, "se".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeListWrapper(toWrap, ["OL"]);

        expect(toWrap.innerHTML).toBe("<ul><li>first</li><ol><li>second</li></ol></ul>");
    });

    test("Should change flat ordered list to unordered", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li><li>second</li></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(toWrap.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeListWrapper(toWrap, ["OL"]);

        expect(toWrap.innerHTML).toBe("<ul><li>first</li><ol><li>second</li></ol></ul>");
    });

    test("Should change one of the nested ordered list to unordered", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>first</li><ol><li>second</li><li>third</li></ol></ul>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("ol > li")[1]?.firstChild as Node, "th".length);
        range.setEnd(toWrap.querySelectorAll("ol > li")[1]?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeListWrapper(toWrap, ["UL"]);

        expect(toWrap.innerHTML).toBe("<ul><li>first</li><ol><li>second</li></ol><ul><li>third</li></ul></ul>");
    });

    test("Should change paragraphs to list", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<p>first</p><p>second</p>";
        document.body.appendChild(toWrap);

        const range = new Range();
        range.setStart(toWrap.querySelectorAll("p")[0]?.firstChild as Node, "fi".length);
        range.setEnd(toWrap.querySelectorAll("p")[1]?.firstChild as Node, "second".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeFirstLevel(toWrap, ["UL", "LI"]);

        expect(toWrap.innerHTML).toBe("<ul><li>first</li><li>second</li></ul>");
    });
});

describe("Merge lists", () => {
    test("Should merge lists from different ul", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1</li></ul><ul><li>text2</li></ul><ul><li>text3</li></ul>";

        const lists = [toWrap.querySelectorAll("ul")[1]?.querySelector("li") as Node];

        mergeLists(toWrap, lists);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li><li>text2</li><li>text3</li></ul>");
    });

    test("Should merge lists from same ul", () => {
        const toWrap = document.createElement("div");
        toWrap.innerHTML = "<ul><li>text1</li><li>text2</li></ul><ul><li>text3</li></ul>";

        const lists = [toWrap.querySelectorAll("ul")[1]?.querySelector("li") as Node];

        mergeLists(toWrap, lists);

        expect(toWrap.innerHTML).toBe("<ul><li>text1</li><li>text2</li><li>text3</li></ul>");
    });
});

