import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {mergeBlocks, mergeNextBlock, mergePreviousBlock} from "@/core/keyboard/util/keyboard-util";
import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Merge previous element", () => {
    test("When cursor is at the start should merge two elements", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <h1 class="start">first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergePreviousBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst <em>second</em></p>
        `);
    });

    // test("When cursor is at the start should remove previous empty element", () => {
    //     const wrapper = createWrapper(`
    //         <p></p>
    //         <h1 class="start">first <em>second</em></h1>
    //     `);
    //
    //     const range = new Range();
    //     range.setStart(getFirstChild(wrapper, ".start"), "".length);
    //     range.setEnd(getFirstChild(wrapper, ".start"), "".length);
    //     (getRange as jest.Mock).mockReturnValue(range);
    //
    //     const cursorPosition = getSelectionOffset(wrapper) as CursorPosition;
    //     mergePreviousBlock(wrapper, cursorPosition);
    //
    //     expectHtml(wrapper.innerHTML, `
    //         <h1 class="start">first <em>second</em></h1>
    //     `);
    // });

    test("When cursor is at the start should merge li with li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first <em>second</em></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergePreviousBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zerofirst <em>second</em></li>
            </ul>
        `);
    });

    test("When cursor is at the start should merge p and li", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <ul>
                <li class="start">first <em>second</em></li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergePreviousBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zerofirst <em>second</em></p>
        `);
    });

    test("When cursor is at the start of nested list should merge li with li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first <em>second</em>
                    <ul>
                        <li class="start">third</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergePreviousBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first <em>second</em>third</li>
            </ul>
        `);
    });

    test("When cursor is at the start of the list containing nested list, merge li with li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first <em>second</em></li>
                <li class="start">third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergePreviousBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>first <em>second</em>third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);
    });
});

describe("Merge next element", () => {
    test("When cursor is at the end should merge two elements", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <h1>first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        mergeNextBlock(wrapper);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zerofirst <em>second</em></p>
        `);
    });

    test("When cursor is at the end should merge empty H1", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <h1></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeNextBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
        `);
    });

    test("When cursor is at the empty element should remove it", () => {
        const wrapper = createWrapper(`
            <h1 class="start"></h1>
            <p>zero</p>            
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start") as Node, "".length);
        range.setEnd(wrapper.querySelector(".start") as Node, "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeNextBlock(wrapper, cursorPosition);

        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
        `);
    });
});

describe("Merge first levels", () => {
    test("Should merge p and h1", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <h1 class="end">first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze rst <em>second</em></p>
        `);
    });
});

describe("Merge P and List selections", () => {
    test("Selection from P into first LI should merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li class="end">first</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze rst</p>
        `);
    });

    test("Selection from P into multiple LIs should merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze cond</p>
        `);
    });

    test("Selection from LI into following P should merge into LI", () => {
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

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze rst</li>
            </ul>
        `);
    });

    test("Selection of entire list and following P should result in UL", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start"> rst</li>
            </ul>
        `);
    });
});

describe("Merge nested list selections", () => {
    test("Selection from start LI into nested LI should merge and flatten", () => {
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
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze st</li>
            </ul>
        `);
    });

    test("Selection from start LI into nested LI with multiple LI should merge and flatten", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ul>
                        <li class="end">first</li>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze st
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection from start LI into nested LI with deeper LI should not merge", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ul>
                        <li class="end">first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fir".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">zero
                    <ul>
                        <li class="end">first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection from nested LI to outer LI should merge preserving structure", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first</li>
                    </ul>
                </li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li class="start">fi cond</li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection spanning 3 nesting levels should merge preserving structure", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li class="start">second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li class="end">third</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li class="start">se ird</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);
    });
});

describe("Merge P and nested list selections", () => {
    test("Selection from P into nested LI should merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ul>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze cond</p>
        `);
    });

    test("Selection from P into nested LI containing nested LI should not merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li class="end">first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
            <ul>
                <li class="end">first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection from P into nested LI containing nested LI of other type should not merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li class="end">third</li>
                            </ul>
                        </li>
                    </ol>
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li class="end">third</li>
                            </ul>
                        </li>
                    </ol>
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `);
    });

    test("Selection from nested LI into following P should merge into LI", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first</li>
                    </ul>
                </li>
            </ul>
            <p class="end">second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li class="start">fi cond</li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection from P spanning outer and nested LI should merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ul>
                        <li>second</li>
                        <li class="end">third</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze ird</p>
        `);
    });

    test("Selection from P spanning outer and first nested LI should not merge", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ul>
                        <li class="end">second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ul>
                        <li class="end">second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection from deeply nested LI into P should merge into LI", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li class="start">second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
            <p class="end">third</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li class="start">se ird</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);
    });

    test("Selection from P through entire nested list structure should merge into P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
                <li class="end">third</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "th".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze ird</p>
        `);
    });
});

describe("Merge complete list selections", () => {
    test("Selection of entire UL and following P should result in UL", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
            </ul>
            <p class="end">second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start"> cond</li>
            </ul>
        `);
    });

    test("Selection from P through entire UL to following P should merge into first P", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <ul>
                <li>first</li>
            </ul>
            <p class="end">second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <p class="start">ze cond</p>
        `);
    });
});

describe("Merge mixed UL/OL selections", () => {
    test("Selection from UL item into OL item should merge into UL", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
            <ol>
                <li class="end">first</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fi".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze rst</li>
            </ul>
        `);
    });

    test("Selection spanning UL, P, and OL should merge into UL", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
            </ul>
            <p>first</p>
            <ol>
                <li class="end">second</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = getCursorPosition();
        mergeBlocks(wrapper, cursorPosition, " ");

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze cond</li>
            </ul>
        `);
    });
});