import {getRange} from "@/core/shared/range-util";
import {getSelectedBlock, getSelectedSharedTags} from "@/core/selection/selection";
import {createWrapper, getFirstChild, getLastChild} from "@/core/shared/test-util";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Shared tags", () => {
    test("Should find shared parents", () => {
        const wrapper = createWrapper(`
            <p>
                <em>
                    zero
                    <strong class="start">first</strong>
                </em>
                <strong class="end">second</strong>
                third
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["STRONG", "P"]);
    });

    test("Should find shared parents from single element", () => {
        const wrapper = createWrapper(`
            <p>
                <em>
                    zero
                    <strong class="start">first</strong>
                </em>
                <strong>second</strong>
                third
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["STRONG", "EM", "P"]);
    });

    test("Should find shared parents when selecting start of the next text", () => {
        const wrapper = createWrapper(`
            <p class="end">
                <strong class="start">zero</strong>
                first
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["STRONG", "P"]);
    });

    test("Should find shared parents when selecting is at the end of the previous text", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong class="end">first</strong></p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["STRONG", "P"]);
    });

    test("Should find parents when cursor is at the empty element", () => {
        const wrapper = createWrapper(`
            <h1 class="empty"><br></h1>
        `);

        const empty = wrapper.querySelector(".empty") as HTMLElement;
        const range = new Range();
        range.setStart(empty, 0);
        range.setEnd(empty, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["H1"]);
    });

    test("Should find parents when cursor is at the empty list element", () => {
        const wrapper = createWrapper(`
            <ul><li class="empty"><br></li></ul>
        `);

        const empty = wrapper.querySelector(".empty") as HTMLElement;
        const range = new Range();
        range.setStart(empty, 0);
        range.setEnd(empty, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["LI", "UL"]);
    });

    test("Should find parents when cursor is at the break of the empty element", () => {
        const wrapper = createWrapper(`
            <h1 class="empty"><br></h1>
        `);

        const br = getFirstChild(wrapper, ".empty");
        const range = new Range();
        range.setStart(br, 0);
        range.setEnd(br, 0);
        (getRange as jest.Mock).mockReturnValue(range);

        const shared = getSelectedSharedTags(wrapper);

        expect(shared).toStrictEqual(["H1"]);
    });
});

test("Should find first level elements arranged by selection", () => {
    const wrapper = createWrapper(`
        <p class="start">
            <strong>zero</strong>
        </p>
        <p class="end">first</p>
    `);

    const startParagraph = wrapper.querySelector(".start") as HTMLElement;
    const endParagraph = wrapper.querySelector(".end") as HTMLElement;

    const start = getFirstChild(startParagraph, "strong");
    const end = endParagraph.firstChild as Node;

    const range = new Range();
    range.setStart(start, "ze".length);
    range.setEnd(end, "fi".length);
    (getRange as jest.Mock).mockReturnValue(range);

    const blocks = getSelectedBlock(wrapper);

    expect(blocks).toStrictEqual([startParagraph, endParagraph]);
});

test("Should find list elements arranged by selection", () => {
    const wrapper = createWrapper(`
        <ul class="start">
            <li>zero</li>
        </ul>
        <ul class="end">
            <li>first</li>
            <li>second</li>
        </ul>
    `);

    const startUl = wrapper.querySelector(".start") as HTMLElement;
    const endUl = wrapper.querySelector(".end") as HTMLElement;

    const start = getFirstChild(startUl, "li");
    const end = getFirstChild(endUl, "li");

    const range = new Range();
    range.setStart(start, "ze".length);
    range.setEnd(end, "fi".length);
    (getRange as jest.Mock).mockReturnValue(range);

    const blocks = getSelectedBlock(wrapper);

    expect(blocks).toStrictEqual([startUl?.querySelector("li"), endUl?.querySelector("li")]);
});