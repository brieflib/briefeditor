import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml} from "@/core/shared/test-util";
import ImageBlock from "@/component/image/image-block";

jest.mock("@/component/image/asset/image-block.css", () => "");
jest.mock("@/component/image/asset/image-control.css?inline=true", () => "");
jest.mock("../../core/shared/range-util", () => ({
        getRange: jest.fn()
    })
);

const IMAGE = `<p class="be-image"><img src="image.png"></p>`;

function rect(left: number, top: number, width: number, height: number) {
    return {left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({})} as DOMRect;
}

function setup(html: string) {
    // The wrapper clears the body, so the scroll container the controller looks up comes after it.
    const wrapper = createWrapper(html);
    const scroll = document.createElement("div");
    scroll.id = "be-content";
    document.body.appendChild(scroll);

    const range = new Range();
    range.setStart(wrapper, 0);
    range.setEnd(wrapper, 0);
    (getRange as jest.Mock).mockReturnValue(range);

    new ImageBlock(wrapper);
    const image = wrapper.querySelector("img") as HTMLImageElement;
    image.getBoundingClientRect = () => rect(100, 50, 200, 150);

    const control = document.body.querySelector("be-image-control") as HTMLElement;
    return {
        wrapper,
        image,
        scroll,
        control,
        button: (control.shadowRoot as ShadowRoot).querySelector(".be-image-control-button") as HTMLElement
    };
}

/** jsdom has no PointerEvent: a plain event is enough, the controller only reads the target. */
function pointer(type: string) {
    return new Event(type, {bubbles: true});
}

function box(control: HTMLElement) {
    return [control.style.left, control.style.top, control.style.width, control.style.height];
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("Image block control", () => {
    test("Should start hidden", () => {
        const {control} = setup(IMAGE);

        expect(control.hidden).toBe(true);
    });

    test("Should lay the control over the image under the pointer", () => {
        const {image, control} = setup(IMAGE);

        image.dispatchEvent(pointer("pointermove"));

        expect(control.hidden).toBe(false);
        expect(box(control)).toEqual(["100px", "50px", "200px", "150px"]);
    });

    test("Should lay the control over the pressed image", () => {
        const {image, control} = setup(IMAGE);

        image.dispatchEvent(pointer("pointerdown"));

        expect(control.hidden).toBe(false);
    });

    test("Should leave the control where it is when the pointer is elsewhere", () => {
        const {wrapper, image, control} = setup(`${IMAGE}<p class="text">text</p>`);
        image.dispatchEvent(pointer("pointermove"));

        (wrapper.querySelector(".text") as HTMLElement).dispatchEvent(pointer("pointermove"));

        expect(control.hidden).toBe(false);
        expect(box(control)).toEqual(["100px", "50px", "200px", "150px"]);
    });

    test("Should ignore an image that is not alone in its block", () => {
        const {image, control} = setup(`<p>text<img src="image.png"></p>`);

        image.dispatchEvent(pointer("pointermove"));

        expect(control.hidden).toBe(true);
    });

    test("Should follow the image when the content scrolls", () => {
        const {image, scroll, control} = setup(IMAGE);
        image.dispatchEvent(pointer("pointermove"));
        image.getBoundingClientRect = () => rect(100, 10, 200, 150);

        scroll.dispatchEvent(new Event("scroll"));

        expect(box(control)).toEqual(["100px", "10px", "200px", "150px"]);
    });

    test("Should hide once its image is gone from the editor", () => {
        const {image, scroll, control} = setup(IMAGE);
        image.dispatchEvent(pointer("pointermove"));
        image.remove();

        scroll.dispatchEvent(new Event("scroll"));

        expect(control.hidden).toBe(true);
    });

    test("Should remove the image block when the control is selected", () => {
        const {wrapper, image, button, control} = setup(`<p class="text">text</p>${IMAGE}`);
        image.dispatchEvent(pointer("pointermove"));

        button.click();

        expectHtml(wrapper.innerHTML, `<p class="text">text</p>`);
        expect(control.hidden).toBe(true);
    });
});
