import {createWrapper, expectHtml} from "@/core/shared/test-util";
import {convertList, ListClass, ListWrapper, parseList} from "@/core/list/type/list-class";

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

});

describe("Convert ListClass to DOM", () => {

    test("Convert nested list", () => {
        const lists = [];

        const zeroList = new ListClass();
        zeroList.listWrapper = ListWrapper.UL;
        zeroList.nestedLevel = 0;
        zeroList.listContent = new DocumentFragment();
        const zeroTextContent = document.createTextNode("zero");
        zeroList.listContent.appendChild(zeroTextContent);
        lists.push(zeroList);

        const firstList = new ListClass();
        firstList.listWrapper = ListWrapper.OL;
        firstList.nestedLevel = 1;
        firstList.listContent = new DocumentFragment();
        const firstStrong = document.createElement("strong");
        const firstStrongTextContent = document.createTextNode("first ");
        firstStrong.appendChild(firstStrongTextContent);
        firstList.listContent.appendChild(firstStrong);
        const firstTextContent = document.createTextNode("second");
        firstList.listContent.appendChild(firstTextContent);
        lists.push(firstList);

        const secondList = new ListClass();
        secondList.listWrapper = ListWrapper.UL;
        secondList.nestedLevel = 2;
        secondList.listContent = new DocumentFragment();
        const secondTextContent = document.createTextNode("third");
        secondList.listContent.appendChild(secondTextContent);
        lists.push(secondList);

        const thirdList = new ListClass();
        thirdList.listWrapper = ListWrapper.OL;
        thirdList.nestedLevel = 1;
        thirdList.listContent = new DocumentFragment();
        const thirdTextContent = document.createTextNode("fourth");
        thirdList.listContent.appendChild(thirdTextContent);
        lists.push(thirdList);

        const list = convertList(lists) as HTMLElement;
        expectHtml(list.outerHTML, `
            <ul>
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
    });

});