import {getRootElement} from "@/core/shared/element-util";
import {createWrapper} from "@/core/shared/test-util";

test("Should find first level element", () => {
    const wrapper = createWrapper(`
        <p>
            <span class="start">zero</span>
        </p>
    `);

    const span = wrapper.querySelector(".start") as HTMLElement;
    const rootElement = getRootElement(wrapper, span);

    expect(rootElement).toBe(wrapper.firstChild);
});