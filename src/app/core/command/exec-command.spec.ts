import {getRange} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {createWrapper, getFirstChild, replaceSpaces} from "@/core/shared/test-util";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Cursor position", () => {
    test("Should apply bold when cursor located at start", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.Tag, tag: "STRONG"});

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <p class="start">
                <strong>zero</strong>
            </p>
            <p class="end">first</p>
        `));
    });

    test("Should change paragraph to unordered list", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p>
            <p class="end">first</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.FirstLevel, tag: ["UL", "LI"]});

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <p class="end">first</p>
        `));
    });

    test("Should change paragraphs to unordered list with a text element", () => {
        const wrapper = createWrapper(`
            <p>
                <strong class="start">zero</strong> 
                first
            </p>
            <p>
                <strong class="end">second</strong>
            </p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.FirstLevel, tag: ["UL", "LI"]});

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>
                    <strong class="start">zero</strong>
                    first
                </li>
                <li>
                    <strong class="end">second</strong>
                </li>
            </ul>
        `));
    });

    test("Should change ordered list to unordered list when cursor is at start", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li class="start">second</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "".length);
        (getRange as jest.Mock).mockReturnValue(range);

        execCommand(wrapper, {action: Action.FirstLevel, tag: ["UL", "LI"]});

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                </li>
            </ul>
        `));
    });
});