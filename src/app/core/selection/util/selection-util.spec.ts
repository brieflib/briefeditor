import {getSelectedLeaves} from "@/core/selection/util/selection-util";
import {getRange} from "@/core/shared/range-util";
import {createWrapper, getFirstChild} from "@/core/shared/test-util";

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

    const range = new Range();
    range.setStart(start, "fi".length);
    range.setEnd(end, "se".length);
    (getRange as jest.Mock).mockReturnValue(range);

    const leaves = getSelectedLeaves(wrapper);

    expect(leaves).toStrictEqual([start, end]);
});