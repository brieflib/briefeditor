import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {Merger} from "@/core/merger/type/merger-class";
import {extractContents, getCursorPosition} from "@/core/shared/type/cursor-position";
import {addParentsFromDom, normalizeNew, wrapInTagNew} from "@/core/normalize/util/normalize-util";

jest.mock("../../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

beforeEach(() => {
    const range = new Range();
    (getRange as jest.Mock).mockReturnValue(range);
});

describe("Merger test", () => {
    test("Should merge extracted content back to dom", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero
                    <ul>
                        <li>first</li>
                        <li class="end">second</li>
                        <li>third</li>
                    </ul>
                </li>
                <li>fourth</li>
                <li>fifth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "sec".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition =  getCursorPosition();
        const merger = new Merger(wrapper, cursorPosition);
        let fragment = extractContents(cursorPosition);
        fragment = addParentsFromDom(wrapper, fragment, cursorPosition);
        merger.initDocumentFragment(fragment);
        const wrapped = wrapInTagNew(fragment, "strong");
        const normalized = normalizeNew(wrapper, wrapped, cursorPosition);
        merger.mergeIntoDom(normalized);

        expectHtml(wrapper.innerHTML, `
            <ul>
                <li class="start">ze<strong>ro</strong>
                    <ul>
                        <li><strong>first</strong></li>
                        <li class="end">sec<strong>ond</strong></li>
                        <li>third</li>
                    </ul>
                </li>
                <li>fourth</li>
                <li>fifth</li>
            </ul>
        `);
    });
});