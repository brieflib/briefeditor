import {createWrapper, getLastChild} from "@/core/shared/test-util";
import {getListsOrderNumbers} from "@/core/list/util/list-util";
import {getRange} from "@/core/shared/range-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe ("Calculate lists order numbers", () => {
    test("Calculate two nested lists numbers", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <ul>
                    <li class="start">first</li>
                    <li class="end">second</li>
                </ul>
            </ul>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const orderNumbers: number[] = getListsOrderNumbers(wrapper);
        expect(orderNumbers[0]).toBe(1);
        expect(orderNumbers[1]).toBe(2);
    });

    test("Calculate three nested lists numbers", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <ul>
                    <li class="start">first</li>
                    <li>second</li>
                </ul>
                <ol>
                    <li class="end">third</li>               
                    <li>fourth</li>               
                </ol>
            </ul>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "".length);
        range.setEnd(getLastChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const orderNumbers: number[] = getListsOrderNumbers(wrapper);
        expect(orderNumbers[0]).toBe(1);
        expect(orderNumbers[1]).toBe(2);
        expect(orderNumbers[2]).toBe(3);
    });
})