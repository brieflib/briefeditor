import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {deleteCommand} from "@/core/keyboard/util/keyboard-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Merge first levels", () => {
    test("When cursor is at the end should merge two elements", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <h1>first <em>second</em></h1>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "zero".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        deleteCommand(wrapper);

        expectHtml(wrapper.innerHTML, `
            <p class="start">zerofirst <em>second</em></p>
        `);
    });
});