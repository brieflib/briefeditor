import {createImageBlock, getRootElement, isImageBlock, wrapImages} from "@/core/shared/element-util";
import {createWrapper, expectHtml} from "@/core/shared/test-util";

test("Should find first level element", () => {
    const wrapper = createWrapper(`
        <p>
            <span class="start">zero</span>
        </p>
    `);

    const span = wrapper.querySelector(".start") as HTMLElement;
    const rootElement = getRootElement(wrapper, span);

    expect(rootElement).toBe(wrapper.firstChild);
});
describe("Image block", () => {
    test("Should build a marked paragraph around an image", () => {
        const image = document.createElement("img");

        const block = createImageBlock(image);

        expectHtml(block.outerHTML, `<p class="be-image"><img></p>`);
        expect(isImageBlock(block)).toBe(true);
    });

    test("Should not read an unmarked paragraph or a text node as an image block", () => {
        const wrapper = createWrapper(`<p><img src="image.png"></p>`);

        expect(isImageBlock(wrapper.firstChild)).toBe(false);
        expect(isImageBlock(wrapper.firstChild?.firstChild)).toBe(false);
        expect(isImageBlock(null)).toBe(false);
    });

    test("Should wrap an image standing between blocks into a block of its own", () => {
        const wrapper = createWrapper(`<p>zero</p><img src="image.png"><p>first</p>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML, `<p>zero</p><p class="be-image"><img src="image.png"></p><p>first</p>`);
    });

    test("Should lift an image standing inline in a line out, keeping the words on either side", () => {
        const wrapper = createWrapper(`<p>zero<img src="image.png">first</p>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML, `<p>zero</p><p class="be-image"><img src="image.png"></p><p>first</p>`);
    });

    test("Should lift an image out of the formatting and the item holding it, dividing the list", () => {
        const wrapper = createWrapper(`<ul><li>zero<strong>first<img src="image.png"></strong></li><li>second</li></ul>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML,
            `<ul><li>zero<strong>first</strong></li></ul><p class="be-image"><img src="image.png"></p><ul><li>second</li></ul>`);
    });

    test("Should drop the half of a line an image leaves holding nothing", () => {
        const wrapper = createWrapper(`<p><em> </em><img src="image.png">first</p>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p><p>first</p>`);
    });

    test("Should mark a line holding nothing but an image rather than nesting a block in it", () => {
        const wrapper = createWrapper(`<p> <img src="image.png"> </p>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p>`);
    });

    test("Should leave an image block as it is", () => {
        const wrapper = createWrapper(`<p class="be-image"><img src="image.png"></p>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p>`);
        expect(wrapper.querySelectorAll("p").length).toBe(1);
    });

    test("Should write the block of an image held by a heading as a paragraph", () => {
        const wrapper = createWrapper(`<h1><img src="image.png"></h1>`);

        wrapImages(wrapper);

        expectHtml(wrapper.innerHTML, `<p class="be-image"><img src="image.png"></p>`);
    });
});
