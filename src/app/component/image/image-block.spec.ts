import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml} from "@/core/shared/test-util";
import ImageBlock from "@/component/image/image-block";

jest.mock("@/component/image/asset/image-block.css", () => "");
jest.mock("@/component/image/asset/image-control.css?inline=true", () => "");
jest.mock("@/component/shared/asset/control-button.css?inline=true", () => "");
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
    scroll.getBoundingClientRect = () => rect(0, 0, 500, 400);
    document.body.appendChild(scroll);

    const range = new Range();
    range.setStart(wrapper, 0);
    range.setEnd(wrapper, 0);
    (getRange as jest.Mock).mockReturnValue(range);

    new ImageBlock(wrapper);
    const image = wrapper.querySelector("img") as HTMLImageElement;
    image.getBoundingClientRect = () => rect(100, 50, 200, 150);

    const control = document.body.querySelector("be-image-control") as HTMLElement;
    const shadow = control.shadowRoot as ShadowRoot;
    const button = shadow.querySelector(".be-image-control-button") as HTMLElement;
    const sizeWrapper = shadow.querySelector(".be-image-control-sizes") as HTMLElement;
    // jsdom lays nothing out: each control reports the corner of the control's box it is drawn in.
    button.getBoundingClientRect = () => corner(control, 0);
    sizeWrapper.getBoundingClientRect = () => corner(control, 1);
    return {
        wrapper,
        image,
        scroll,
        control,
        button,
        sizeWrapper,
        sizes: Array.from(shadow.querySelectorAll(".be-image-control-size")) as HTMLElement[]
    };
}

/** The box of a control drawn at the top (`edge` 0) or the bottom (`edge` 1) of the control's box. */
function corner(control: HTMLElement, edge: number) {
    const top = parseFloat(control.style.top);
    const height = parseFloat(control.style.height);
    return rect(parseFloat(control.style.left), top + edge * (height - 10), 10, 10);
}

function active(sizes: HTMLElement[]) {
    return sizes.filter((size) => size.classList.contains("active")).map((size) => size.textContent);
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

    test("Should hide the cross once the image's top has scrolled out of the editor", () => {
        const {image, scroll, button, sizeWrapper} = setup(IMAGE);
        image.dispatchEvent(pointer("pointermove"));
        image.getBoundingClientRect = () => rect(100, -20, 200, 150);

        scroll.dispatchEvent(new Event("scroll"));

        expect(button.style.visibility).toBe("hidden");
        expect(sizeWrapper.style.visibility).toBe("");
    });

    test("Should hide the sizes once the image's bottom has scrolled out of the editor", () => {
        const {image, scroll, button, sizeWrapper} = setup(IMAGE);
        image.dispatchEvent(pointer("pointermove"));
        image.getBoundingClientRect = () => rect(100, 300, 200, 150);

        scroll.dispatchEvent(new Event("scroll"));

        expect(button.style.visibility).toBe("");
        expect(sizeWrapper.style.visibility).toBe("hidden");
    });

    test("Should show a control again once it has scrolled back into the editor", () => {
        const {image, scroll, button} = setup(IMAGE);
        image.dispatchEvent(pointer("pointermove"));
        image.getBoundingClientRect = () => rect(100, -20, 200, 150);
        scroll.dispatchEvent(new Event("scroll"));
        image.getBoundingClientRect = () => rect(100, 20, 200, 150);

        scroll.dispatchEvent(new Event("scroll"));

        expect(button.style.visibility).toBe("");
    });

    test("Should remove the image block when the control is selected", () => {
        const {wrapper, image, button, control} = setup(`<p class="text">text</p>${IMAGE}`);
        image.dispatchEvent(pointer("pointermove"));

        button.click();

        expectHtml(wrapper.innerHTML, `<p>text</p>`);
        expect(control.hidden).toBe(true);
    });
});

describe("Image block sizes", () => {
    test("Should offer a button per size class", () => {
        const {sizes} = setup(IMAGE);

        expect(sizes.map((size) => size.textContent)).toEqual(["SMALL", "MEDIUM", "LARGE"]);
        expect(sizes.map((size) => size.dataset.class)).toEqual(["be-image-small", "be-image-medium", "be-image-large"]);
    });

    test("Should mark the default size for an image block without one", () => {
        const {image, sizes} = setup(IMAGE);

        image.dispatchEvent(pointer("pointermove"));

        expect(active(sizes)).toEqual(["MEDIUM"]);
    });

    test("Should mark the size the hovered image block carries", () => {
        const {image, sizes} = setup(`<p class="be-image be-image-medium"><img src="image.png"></p>`);

        image.dispatchEvent(pointer("pointermove"));

        expect(active(sizes)).toEqual(["MEDIUM"]);
    });

    test("Should switch the block to the pressed size", () => {
        const {wrapper, image, sizes} = setup(`<p class="be-image be-image-medium"><img src="image.png"></p>`);
        image.dispatchEvent(pointer("pointermove"));

        (sizes[2] as HTMLElement).click();

        expectHtml(wrapper.innerHTML, `<p class="be-image be-image-large"><img src="image.png"></p>`);
        expect(active(sizes)).toEqual(["LARGE"]);
    });

    test("Should keep the size when its button is pressed again", () => {
        const {wrapper, image, sizes} = setup(`<p class="be-image be-image-large"><img src="image.png"></p>`);
        image.dispatchEvent(pointer("pointermove"));

        (sizes[2] as HTMLElement).click();

        expectHtml(wrapper.innerHTML, `<p class="be-image be-image-large"><img src="image.png"></p>`);
        expect(active(sizes)).toEqual(["LARGE"]);
    });
});
