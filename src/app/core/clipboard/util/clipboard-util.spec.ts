import {createWrapper, expectHtml, getFirstChild, getLastChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import {tag} from "@/core/command/util/command-util";
import {Action} from "@/core/command/type/command";
import {sanitize} from "@/core/clipboard/util/clipboard-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

// describe("Sanitize input", () => {
//     test("Should unwrap strong from selection", () => {
//         const wrapper = createWrapper(`
//             <p class="start">first</p>
//         `);
//
//         const range = new Range();
//         range.setStart(getFirstChild(wrapper, ".start"), "".length);
//         range.setEnd(getFirstChild(wrapper, ".start"), "".length);
//         (getRange as jest.Mock).mockReturnValue(range);
//
//         const cursorPosition = getCursorPosition();
//         sanitize(`<strong style="margin: 0">second<span>third</span></strong>`, cursorPosition);
//
//         expectHtml(wrapper.innerHTML, `
//         `);
//     });
// });