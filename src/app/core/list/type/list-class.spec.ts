import {createWrapper, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {
    convertList,
    ListWrapper,
    minusOrderNumbers,
    normalizeLists,
    parseList,
    plusOrderNumbers
} from "@/core/list/type/list-class";
import {getRange} from "@/core/shared/range-util";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
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
        let lists = parseList(rootWrapper);
        lists = normalizeLists(lists);
        const listWrapper = convertList(lists).firstElementChild as HTMLElement;
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
        let lists = parseList(rootWrapper);
        lists = normalizeLists(lists);
        const listWrapper = convertList(lists).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>second
                    <ul>
                        <li>third</li>                    
                    </ul>
                </li>
            </ul>
        `);
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

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

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

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

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