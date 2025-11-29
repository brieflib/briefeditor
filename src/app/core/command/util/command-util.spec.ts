import {changeBlock, tag} from "@/core/command/util/command-util";
import {getRange} from "@/core/shared/range-util";
import {Action} from "@/core/command/type/command";
import {getFirstChild, getLastChild, replaceSpaces} from "@/core/shared/test-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Unwrap tag", () => {
    test("Should unwrap strong from selection", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>
                <strong>
                    <u>
                        <i>bolditalic</i>
                        par
                    </u>
                </strong>
                italic
            </p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p > strong > u > i"), "bold".length);
        range.setEnd(getLastChild(wrapper, "p > strong > u"), "pa".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("STRONG", wrapper, Action.Unwrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
             <p>
                <strong>
                    <u>
                        <i>bold</i>
                    </u>
                </strong>
                <u>
                    <i>italic</i>
                    pa
                </u>
                <strong>
                    <u>r</u>
                </strong>
                italic
            </p>
        `));
    });

    test("Should unwrap strong from different li", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>fi<strong>rst</strong></li>
                <li><strong>sec</strong>ond</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li:nth-child(1) > strong"), "".length);
        range.setEnd(getFirstChild(wrapper, "ul > li:nth-child(2) > strong"), "sec".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("STRONG", wrapper, Action.Unwrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
        `));
    });
});

describe("Wrap in tag", () => {
    test("Should wrap selection in italic", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>
                <strong>Wri</strong>
                te text here
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p > strong"), "Wri".length);
        range.setEnd(getLastChild(wrapper, "p"), "te".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("em", wrapper, Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>
                <strong>Wri</strong>
                <em>te</em>
                text here
            </p>
        `));
    });

    test("Should wrap selection from the different paragraphs in italic", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>Write </p>
            <p>
                <strong>text </strong>
            </p>
            <p>here</p>        
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p:nth-child(1)"), "Wri".length);
        range.setEnd(getFirstChild(wrapper, "p:nth-child(3)"), "he".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("em", wrapper, Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>Wri
                <em>te </em>
            </p>
            <p>
                <strong>
                    <em>text </em>
                </strong>
            </p>
            <p>
                <em>he</em>
                re
            </p>
        `));
    });

    test("Should wrap selection from different elements in bold", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>Write 
                <strong>text</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p"), "Wri".length);
        range.setEnd(getFirstChild(wrapper, "p > strong"), "te".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("strong", wrapper, Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>Wri
                <strong>te text</strong>
            </p>
        `));
    });

    test("Should wrap unordered list in bold", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>
                    first
                    <u>under</u>
                    <em>test</em>
                </li>
                <li>second</li>
                <li>third</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li:nth-child(1) > u"), "un".length);
        range.setEnd(getFirstChild(wrapper, "ul > li:nth-child(3)"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("strong", wrapper, Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <u>un</u>
                    <strong>
                        <u>der</u>
                        <em>test</em>
                    </strong>
                </li>
                <li>
                    <strong>second</strong>
                </li>
                <li>
                    <strong>th</strong>
                    ird
                </li>
            </ul>
        `));
    });

    test("Should wrap unordered list and paragraph in bold", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <p>second</p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li"), "fi".length);
        range.setEnd(getFirstChild(wrapper, "p"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag("strong", wrapper, Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>fi
                    <strong>rst</strong>
                </li>
            </ul>
            <p>
                <strong>se</strong>
                cond
            </p>
        `));
    });
});

describe("Change first level", () => {
    test("Should change paragraph to heading", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>Paragraph</p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p"), "".length);
        range.setEnd(getFirstChild(wrapper, "p"), "par".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["H1"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <h1>Paragraph</h1>
        `));
    });

    test("Should wrap strong in heading", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>
                <strong>Paragraph</strong>
            </p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p > strong"), "".length);
        range.setEnd(getFirstChild(wrapper, "p > strong"), "Par".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["H1"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <h1>
                <strong>Paragraph</strong>
            </h1>
        `));
    });

    test("Should wrap strong in unordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>
                <strong>Paragraph</strong>
            </p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p > strong"), "".length);
        range.setEnd(getFirstChild(wrapper, "p > strong"), "Par".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>
                    <strong>Paragraph</strong>
                </li>
            </ul>
        `));
    });

    test("Should unwrap list to paragraph", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>text1
                    <ul>
                        <li>
                            <strong>text2</strong>
                        </li>
                    </ul>
                </li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li > ul > li > strong"), "".length);
        range.setEnd(getFirstChild(wrapper, "ul > li > ul > li > strong"), "te".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>text1</li>
            </ul>
            <p>
                <strong>text2</strong>
            </p>
        `));
    });

    test("Should change ordered list to paragraph", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>Paragraph</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li"), "".length);
        range.setEnd(getFirstChild(wrapper, "ul > li"), "Par".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>Paragraph</p>
        `));
    });

    test("Should wrap paragraph elements to ordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>Paragraph</li>
            </ul>
            <p>text</p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p"), "".length);
        range.setEnd(getFirstChild(wrapper, "p"), "te".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>Paragraph</li>
                <li>text</li>
            </ul>
        `));
    });

    test("Should change tag from the li to the paragraph", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li:nth-child(2)"), "".length);
        range.setEnd(getFirstChild(wrapper, "ul > li:nth-child(2)"), "sec".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <p>second</p>
            <ul>
                <li>third</li>
            </ul>        
        `));
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
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first<br>second</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li"), "".length);
        range.setEnd(getFirstChild(wrapper, "ul > li"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>first<br>second</p>
        `));
    });

    test("Should change paragraph divided by br to list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>first<br>second</p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p"), "".length);
        range.setEnd(getFirstChild(wrapper, "p"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first<br>second</li>
            </ul>
        `));
    });

    test("Should change paragraph with strong tag to list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>fir
                <strong>st se</strong>
                cond
            </p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p"), "".length);
        range.setEnd(getFirstChild(wrapper, "p"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>fir
                    <strong>st se</strong>
                    cond
                </li>
            </ul>
        `));
    });

    test("Should change multiple lists to paragraph", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li:nth-child(1)"), "fi".length);
        range.setEnd(getFirstChild(wrapper, "ul > li:nth-child(3)"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>first</p>
            <p>second</p>
            <p>third</p>
        `));
    });

    test("Should change inner unordered list to ordered", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <ul>
                    <li>second</li>
                </ul>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > ul > li"), "se".length);
        range.setEnd(getFirstChild(wrapper, "ul > ul > li"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["OL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <ol>
                    <li>second</li>
                </ol>
            </ul>
        `));
    });

    test("Should change flat ordered list to unordered", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li:nth-child(2)"), "se".length);
        range.setEnd(getFirstChild(wrapper, "ul > li:nth-child(2)"), "se".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["OL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <li>second</li>
            </ol>
        `));
    });

    test("Should change one of the nested ordered list to unordered", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ul > li > ol > li:nth-child(2)"), "th".length);
        range.setEnd(getFirstChild(wrapper, "ul > li > ol > li:nth-child(2)"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should change parent ordered list to unordered", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ol>
                <li>second
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ol>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "ol > li:nth-child(1)"), "se".length);
        range.setEnd(getFirstChild(wrapper, "ol > li:nth-child(1)"), "sec".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>second
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Should change paragraphs to list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <p>first</p>
            <p>second</p>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "p:nth-child(1)"), "fi".length);
        range.setEnd(getFirstChild(wrapper, "p:nth-child(2)"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
        `));
    });
});

