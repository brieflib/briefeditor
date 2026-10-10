import {createWrapper, expectHtml, getFirstChild, getLastChild, selectRange} from "@/core/shared/test-util";
import {
    convertList,
    ListWrapper,
    minusOrderNumbers,
    normalizeLists,
    parseList,
    plusOrderNumbers
} from "@/core/list/type/list-class";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {getCursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {getListsOrderNumbers} from "@/core/list/util/list-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Parse to ListClass", () => {
    test("Parse nested list", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero</li>
                <ol>
                    <li><strong>first </strong>second
                        <ul>
                            <li>third</li>
                        </ul>
                    </li>
                    <li>fourth</li>
                </ol>
            </ul>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        expect(lists[0]?.listWrapper).toBe(ListWrapper.UL);
        expect(lists[0]?.nestedLevel).toBe(0);
        expect(lists[0]?.listContent.textContent).toBe("zero");

        expect(lists[1]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[1]?.nestedLevel).toBe(1);
        expect(lists[1]?.listContent.textContent).toBe("first second");

        expect(lists[2]?.listWrapper).toBe(ListWrapper.UL);
        expect(lists[2]?.nestedLevel).toBe(2);
        expect(lists[2]?.listContent.textContent).toBe("third");

        expect(lists[3]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[3]?.nestedLevel).toBe(1);
        expect(lists[3]?.listContent.textContent).toBe("fourth");
    });

    test("Parse multiple list wrappers", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero</li>
            </ol>
            <ul class="start">
                <li>first</li>
            </ul>
            <ol>
                <li>second</li>
            </ol>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        expect(lists[0]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[0]?.nestedLevel).toBe(0);
        expect(lists[0]?.listContent.textContent).toBe("zero");

        expect(lists[1]?.listWrapper).toBe(ListWrapper.UL);
        expect(lists[1]?.nestedLevel).toBe(0);
        expect(lists[1]?.listContent.textContent).toBe("first");

        expect(lists[2]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[2]?.nestedLevel).toBe(0);
        expect(lists[2]?.listContent.textContent).toBe("second");
    });
});

describe("Convert ListClass to DOM", () => {
    test("Normalize list", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero
                    <ol>
                        <li>
                            <ul>
                                <li>second</li>
                            </ul>
                            <ol>
                                <li>third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const normalized = normalizeLists(parseList(rootWrapper), getCursorPositionFrom(wrapper, 0, wrapper, 0, false));
        const listWrapper = convertList(normalized.lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li>second</li>
                    </ul>
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `);
        expect(normalized.cursorPosition.startContainer).toBe(wrapper);
        expect(normalized.cursorPosition.startOffset).toBe(0);
        expect(normalized.cursorPosition.endContainer).toBe(wrapper);
        expect(normalized.cursorPosition.endOffset).toBe(0);
    });

    test("Normalize list with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>
                    <ul>
                        <li>second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const normalized = normalizeLists(parseList(rootWrapper), getCursorPositionFrom(wrapper, 0, wrapper, 0, false));
        const listWrapper = convertList(normalized.lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);
        expect(normalized.cursorPosition.startContainer).toBe(wrapper);
        expect(normalized.cursorPosition.startOffset).toBe(0);
        expect(normalized.cursorPosition.endContainer).toBe(wrapper);
        expect(normalized.cursorPosition.endOffset).toBe(0);
    });

    test("Convert nested list", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero
                    <ol>
                        <li><strong>first </strong>second
                            <ul>
                                <li>third</li>
                            </ul>
                        </li>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        const listWrapper = convertList(lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li><strong>first </strong>second
                            <ul>
                                <li>third</li>
                            </ul>
                        </li>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `);
    });

    test("Convert nested ordered list", () => {
        const wrapper = createWrapper(`
            <ol class="start">
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>               
                </li>
            </ol>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        const listWrapper = convertList(lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ol>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>               
                </li>
            </ol>
        `);
    });

    test("Convert list with different types", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                            <ol>
                                <li>third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        const listWrapper = convertList(lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                            <ol>
                                <li>third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);
    });

    test("Convert list with nested lists of different type", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                        <li>third</li>
                    </ul>
                </li>          
            </ul>
        `);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        const listWrapper = convertList(lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                        <li>third</li>
                    </ul>
                </li>          
            </ul>
        `);
    });
});

describe("Plus indent", () => {
    test("Plus indent of two same nesting level list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li class="end">second</li>
            </ul>
        `);

        selectRange(getLastChild(wrapper, ".start"), "".length, getLastChild(wrapper, ".end"), "".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = plusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(1);
        expect(result[2]?.nestedLevel).toBe(1);
    });

    test("Plus indent of two different nesting level list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <ol>
                    <li class="end">second</li> 
                    <li>third</li> 
                </ol>
            </ul>
        `);

        selectRange(getLastChild(wrapper, ".start"), "".length, getLastChild(wrapper, ".end"), "".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = plusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(1);
        expect(result[2]?.nestedLevel).toBe(2);
        expect(result[3]?.nestedLevel).toBe(1);
    });

    test("Plus indent of nesting level list with previous ul list wrapper", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>         
            </ul>
            <ol>
                <li>first</li>
                <li class="start">second</li>
            </ol>
        `);

        selectRange(getLastChild(wrapper, ".start"), "".length, getLastChild(wrapper, ".start"), "".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = plusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(0);
        expect(result[2]?.nestedLevel).toBe(1);
    });

    test("Plus indent of nesting level list with nested ul list wrapper", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first
                    <ul>
                        <li class="end">second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".end"), "second".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = plusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(1);
        expect(result[2]?.nestedLevel).toBe(2);
        expect(result[3]?.nestedLevel).toBe(1);
    });

    test("Plus indent of multiple nested list wrappers", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                    <ol>
                        <li class="end">third</li>
                    </ol>
                </li>
            </ul>
        `);

        selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".end"), "".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = plusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(1);
        expect(result[2]?.nestedLevel).toBe(2);
        expect(result[3]?.nestedLevel).toBe(2);
    });
});

describe("Minus indent", () => {
    test("Minus indent of two same nesting level list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <ol>
                    <li class="start">first</li>
                    <li class="end">second</li>                
                </ol>
            </ul>
        `);

        selectRange(getLastChild(wrapper, ".start"), "".length, getLastChild(wrapper, ".end"), "".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = minusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(0);
        expect(result[2]?.nestedLevel).toBe(0);
    });

    test("Minus indent of two different nesting level list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <ul>
                    <li class="start">first</li>
                    <ol>
                        <li class="end">second</li> 
                        <li>third</li> 
                    </ol>                
                </ul>
            </ul>
        `);

        selectRange(getLastChild(wrapper, ".start"), "".length, getLastChild(wrapper, ".end"), "".length);

        const cursorPosition = getCursorPosition();
        const rootWrapper = getFirstSelectedRoot(wrapper, cursorPosition);
        const orderNumbers = getListsOrderNumbers(wrapper);
        const lists = parseList(rootWrapper);
        const result = minusOrderNumbers(lists, orderNumbers);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(0);
        expect(result[2]?.nestedLevel).toBe(1);
        expect(result[3]?.nestedLevel).toBe(2);
    });
});