import {getRange} from "@/core/shared/range-util";
import {createWrapper} from "@/core/shared/test-util";
import Tooltip from "@/component/popup/tooltip";

jest.mock("@/component/popup/asset/tooltip.css?inline=true", () => "");
jest.mock("../../core/shared/range-util", () => ({
        getRange: jest.fn()
    })
);

function rect(left: number, top: number, width: number, height: number) {
    return {left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({})} as DOMRect;
}

function setup() {
    // The wrapper clears the body, so the scroll container the tooltip looks up comes after it.
    const wrapper = createWrapper(`<p class="start">text</p>`);
    const scroll = document.createElement("div");
    scroll.id = "be-content";
    scroll.getBoundingClientRect = () => rect(0, 0, 500, 400);
    document.body.appendChild(scroll);

    let cursorRect = rect(100, 50, 40, 20);

    const range = new Range();
    range.setStart(wrapper, 0);
    range.setEnd(wrapper, 0);
    // The cursor's own box is what the tooltip is laid over.
    range.getBoundingClientRect = () => cursorRect;
    (getRange as jest.Mock).mockReturnValue(range);

    const tooltip = new Tooltip();
    document.body.appendChild(tooltip);

    return {
        scroll,
        tooltip,
        wrapper: tooltip.shadowRoot?.querySelector(".be-tooltip-wrapper") as HTMLElement,
        scrollTo: (top: number) => {
            cursorRect = rect(100, top, 40, 20);
            scroll.dispatchEvent(new Event("scroll"));
        }
    };
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("Tooltip", () => {
    test("Should start closed", () => {
        const {wrapper} = setup();

        expect(wrapper.hasAttribute("open")).toBe(false);
    });

    test("Should open over the cursor", () => {
        const {tooltip, wrapper} = setup();

        tooltip.open();

        expect(wrapper.hasAttribute("open")).toBe(true);
        expect([wrapper.style.top, wrapper.style.left]).toEqual(["50px", "120px"]);
    });

    test("Should close", () => {
        const {tooltip, wrapper} = setup();
        tooltip.open();

        tooltip.close();

        expect(wrapper.hasAttribute("open")).toBe(false);
    });

    test("Should follow the cursor when the content scrolls", () => {
        const {tooltip, wrapper, scrollTo} = setup();
        tooltip.open();

        scrollTo(10);

        expect(wrapper.hasAttribute("open")).toBe(true);
        expect([wrapper.style.top, wrapper.style.left]).toEqual(["10px", "120px"]);
    });

    test("Should hide once the cursor has scrolled out of the editor", () => {
        const {tooltip, wrapper, scrollTo} = setup();
        tooltip.open();

        scrollTo(-30);

        expect(wrapper.hasAttribute("open")).toBe(false);
    });

    test("Should show again once the cursor has scrolled back into the editor", () => {
        const {tooltip, wrapper, scrollTo} = setup();
        tooltip.open();
        scrollTo(-30);

        scrollTo(20);

        expect(wrapper.hasAttribute("open")).toBe(true);
    });

    test("Should stay closed when opened on a cursor out of the editor", () => {
        const {tooltip, wrapper, scrollTo} = setup();
        scrollTo(420);

        tooltip.open();

        expect(wrapper.hasAttribute("open")).toBe(false);
    });
});
