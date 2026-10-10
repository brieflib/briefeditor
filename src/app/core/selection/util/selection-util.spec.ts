import {getSelectedLeaves} from "@/core/selection/util/selection-util";
import {createWrapper, getFirstChild, selectRange} from "@/core/shared/test-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

test("Should find selected leaf nodes", () => {
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

    const start = getFirstChild(wrapper, ".start");
    const end = getFirstChild(wrapper, ".end");

    selectRange(start, "fi".length, end, "se".length);

    const leaves = getSelectedLeaves(wrapper);

    expect(leaves).toStrictEqual([start, end]);
});