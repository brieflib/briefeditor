import {createWrapper, expectHtml, getFirstChild, getLastChild, selectRange} from "@/core/shared/test-util";
import {convertList, ListClass, ListWrapper, normalizeLists, parseList} from "@/core/list/type/list-class";

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

        selectRange(getFirstChild(wrapper, ".start li"), "ze".length, getFirstChild(wrapper, ".start li"), "ze".length);

        const rootWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(rootWrapper);

        expect(lists[0]?.listWrapper).toBe(ListWrapper.UL);
        expect(lists[0]?.nestedLevel).toBe(0);
        expect(lists[0]?.listContent.textContent).toBe("zero");
        expect(lists[0]?.selected).toBe(true);

        expect(lists[1]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[1]?.nestedLevel).toBe(1);
        expect(lists[1]?.listContent.textContent).toBe("first second");
        expect(lists[1]?.selected).toBe(false);

        expect(lists[2]?.listWrapper).toBe(ListWrapper.UL);
        expect(lists[2]?.nestedLevel).toBe(2);
        expect(lists[2]?.listContent.textContent).toBe("third");
        expect(lists[2]?.selected).toBe(false);

        expect(lists[3]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[3]?.nestedLevel).toBe(1);
        expect(lists[3]?.listContent.textContent).toBe("fourth");
        expect(lists[3]?.selected).toBe(false);
    });

    test("Parse multiple list wrappers", () => {
        const wrapper = createWrapper(`
            <ol class="start">
                <li>zero</li>
            </ol>
            <ul class="middle">
                <li>first</li>
            </ul>
            <ol>
                <li>second</li>
            </ol>
        `);

        selectRange(getFirstChild(wrapper, ".start li"), "ze".length, getFirstChild(wrapper, ".middle li"), "ze".length);


        const middle = wrapper.querySelector(".middle") as HTMLElement;
        const lists = parseList(middle);

        expect(lists[0]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[0]?.nestedLevel).toBe(0);
        expect(lists[0]?.listContent.textContent).toBe("zero");
        expect(lists[0]?.selected).toBe(true);

        expect(lists[1]?.listWrapper).toBe(ListWrapper.UL);
        expect(lists[1]?.nestedLevel).toBe(0);
        expect(lists[1]?.listContent.textContent).toBe("first");
        expect(lists[1]?.selected).toBe(true);

        expect(lists[2]?.listWrapper).toBe(ListWrapper.OL);
        expect(lists[2]?.nestedLevel).toBe(0);
        expect(lists[2]?.listContent.textContent).toBe("second");
        expect(lists[2]?.selected).toBe(false);
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

        const ulWrapper = wrapper.querySelector(".start") as HTMLElement;
        const normalized = normalizeLists(parseList(ulWrapper));
        const listWrapper = convertList(normalized).firstElementChild as HTMLElement;
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
        // expect(normalized.cursorPosition.startContainer).toBe(wrapper);
        // expect(normalized.cursorPosition.startOffset).toBe(0);
        // expect(normalized.cursorPosition.endContainer).toBe(wrapper);
        // expect(normalized.cursorPosition.endOffset).toBe(0);
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

        const ulWrapper = wrapper.querySelector(".start") as HTMLElement;
        const normalized = normalizeLists(parseList(ulWrapper),);
        const listWrapper = convertList(normalized).firstElementChild as HTMLElement;
        expectHtml(listWrapper.outerHTML, `
            <ul>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);
        // expect(normalized.cursorPosition.startContainer).toBe(wrapper);
        // expect(normalized.cursorPosition.startOffset).toBe(0);
        // expect(normalized.cursorPosition.endContainer).toBe(wrapper);
        // expect(normalized.cursorPosition.endOffset).toBe(0);
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

        const ulWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(ulWrapper);

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

        const olWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(olWrapper);

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

        const ulWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(ulWrapper);

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

        const ulWrapper = wrapper.querySelector(".start") as HTMLElement;
        const lists = parseList(ulWrapper);

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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[1] as ListClass).nestedLevel = 2;
        (lists[2] as ListClass).nestedLevel = 3;
        const result = normalizeLists(lists);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(1);
        expect(result[2]?.nestedLevel).toBe(2);
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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[1] as ListClass).nestedLevel = 1;
        (lists[2] as ListClass).nestedLevel = 2;
        const result = normalizeLists(lists);

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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[2] as ListClass).nestedLevel = 1;
        const result = normalizeLists(lists);

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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[1] as ListClass).nestedLevel = 1;
        (lists[2] as ListClass).nestedLevel = 2;
        const result = normalizeLists(lists);

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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[1] as ListClass).nestedLevel = 1;
        (lists[2] as ListClass).nestedLevel = 3;
        (lists[3] as ListClass).nestedLevel = 2;
        const result = normalizeLists(lists);

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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[1] as ListClass).nestedLevel = 0;
        const result = normalizeLists(lists);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(0);
        expect(result[2]?.nestedLevel).toBe(1);
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

        const ulWrapper = wrapper.querySelector("ul") as HTMLElement;
        const lists = parseList(ulWrapper);
        (lists[2] as ListClass).nestedLevel = 0;
        const result = normalizeLists(lists);

        expect(result[0]?.nestedLevel).toBe(0);
        expect(result[1]?.nestedLevel).toBe(1);
        expect(result[2]?.nestedLevel).toBe(0);
        expect(result[3]?.nestedLevel).toBe(1);
    });
});

describe("Selection", () => {
    test("Mark lines selected by the cursor", () => {
        const wrapper = createWrapper(`
         <ul class="list">
             <li>zero</li>
             <li class="start">first
                 <ul>
                     <li class="end">second</li>
                 </ul>
             </li>
             <li>third</li>
         </ul>
     `);

        selectRange(getFirstChild(wrapper, ".start"), "fi".length, getFirstChild(wrapper, ".end"), "sec".length);

        const lists = parseList(wrapper.querySelector(".list") as HTMLElement);

        expect(lists[0]?.selected).toBe(false);
        expect(lists[1]?.selected).toBe(true);
        expect(lists[2]?.selected).toBe(true);
        expect(lists[3]?.selected).toBe(false);
    });
});