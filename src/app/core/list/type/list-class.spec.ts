import {createWrapper} from "@/core/shared/test-util";
import {ListWrapper, parseList} from "@/core/list/type/list-class";

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