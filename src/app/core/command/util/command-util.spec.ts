import {changeBlock, tag} from "@/core/command/util/command-util";
import {getRange} from "@/core/shared/range-util";
import {Action} from "@/core/command/type/command";
import {createWrapper, getFirstChild, getLastChild, replaceSpaces} from "@/core/shared/test-util";
import execCommand from "@/core/command/exec-command";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Unwrap tag", () => {
    test("Should unwrap strong from selection", () => {
        const wrapper = createWrapper(`
            <p>
                <strong>
                    <u class="end">
                        <i class="start">zero</i>
                        first
                    </u>
                </strong>
                second
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getLastChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "STRONG", Action.Unwrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
             <p>
                <strong>
                    <u class="end">
                        <i class="start">ze</i>
                    </u>
                </strong>
                <u class="end">
                    <i class="start">ro</i>
                    fi
                </u>
                <strong>
                    <u class="end">rst</u>
                </strong>
                second
            </p>
        `));
    });

    test("Should unwrap strong from different li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>ze<strong class="start">ro</strong></li>
                <li><strong class="end">fir</strong>st</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "STRONG", Action.Unwrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `));
    });
});

describe("Wrap in tag", () => {
    test("Should wrap selection in italic", () => {
        const wrapper = createWrapper(`
            <p class="end">
                <strong class="start">zero</strong>
                first
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getLastChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "em", Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p class="end">
                <strong class="start">zero</strong>
                <em>fi</em>
                rst
            </p>
        `));
    });

    test("Should wrap selection from the different paragraphs in italic", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p>
                <strong>first</strong>
            </p>
            <p class="end">second</p>        
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zer".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "em", Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p class="start">zer
                <em>o</em>
            </p>
            <p>
                <strong>
                    <em>first</em>
                </strong>
            </p>
            <p class="end">
                <em>se</em>
                cond
            </p>
        `));
    });

    test("Should wrap selection from different elements in bold", () => {
        const wrapper = createWrapper(`
            <p class="start">zero 
                <strong class="end">first</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zer".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "strong", Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p class="start">zer
                <strong class="end">o first</strong>
            </p>
        `));
    });

    test("Should wrap unordered list in bold", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>
                    zero
                    <u class="start">first</u>
                    <em>second</em>
                </li>
                <li>third</li>
                <li class="end">fourth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fo".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "strong", Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <u class="start">fi</u>
                    <strong>
                        <u class="start">rst</u>
                        <em>second</em>
                    </strong>
                </li>
                <li>
                    <strong>third</strong>
                </li>
                <li class="end">
                    <strong>fo</strong>
                    urth
                </li>
            </ul>
        `));
    });

    test("Should wrap unordered list and paragraph in bold", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        tag(wrapper, "strong", Action.Wrap);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li class="start">ze
                    <strong>ro</strong>
                </li>
            </ul>
            <p class="end">
                <strong>fi</strong>
                rst
            </p>
        `));
    });
});

describe("Change first level", () => {
    test("Should change paragraph to heading", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["H1"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <h1>zero</h1>
        `));
    });

    test("Should wrap strong in heading", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["H1"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <h1>
                <strong class="start">zero</strong>
            </h1>
        `));
    });

    test("Should wrap strong in unordered list", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>
                    <strong class="start">zero</strong>
                </li>
            </ul>
        `));
    });

    test("Should unwrap list to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li>
                            <strong class="start">first</strong>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <p>
                <strong class="start">first</strong>
            </p>
        `));
    });

    test("Should change ordered list to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>zero</p>
        `));
    });

    test("Should wrap paragraph element to ordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
            </ul>
            <p class="start">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `));
    });

    test("Should change tag from the li to the paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li>second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <p>first</p>
            <ul>
                <li>second</li>
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
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero<br>first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>zero<br>first</p>
        `));
    });

    test("Should change list with strong to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">
                    <strong>zero</strong>
                    first
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>
                <strong>zero</strong>
                first
            </p>
        `));
    });

    test("Should change list with strong divided by br to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start"><strong>zero<br>first</strong></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>
                <strong>zero<br>first</strong>
            </p>
        `));
    });

    test("Should change nested lists to two paragraphs", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ul>
                        <li class="end">first</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>zero</p>
            <p>first</p>
        `));
    });

    test("Should change paragraph divided by br to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<br>first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero<br>first</li>
            </ul>
        `));
    });

    test("Should change paragraph with strong tag to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero
                <strong>first</strong>
                second
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "ze".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <strong>first</strong>
                    second
                </li>
            </ul>
        `));
    });

    test("Should change multiple lists to paragraph", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["P"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p>zero</p>
            <p>first</p>
            <p>second</p>
        `));
    });

    test("Should change inner unordered list to ordered", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <ul>
                    <li class="start">first</li>
                </ul>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["OL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <ol>
                    <li class="start">first</li>
                </ol>
            </ul>
        `));
    });

    test("Should change flat ordered list to unordered", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "fi".length);

        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["OL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li class="start">first</li>
            </ol>
        `));
    });

    test("Should change one of the nested ordered list to unordered", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li class="start">second</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should change parent ordered list to unordered", () => {
        const wrapper = createWrapper(`
            <ol>
                <li class="start">zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zer".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li class="start">zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Should change paragraphs to list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        changeBlock(wrapper, ["UL", "LI"]);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
        `));
    });
});