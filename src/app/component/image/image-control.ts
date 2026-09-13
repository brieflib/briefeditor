// @ts-expect-error inline is not supported by lint
import imageControlCss from "@/component/image/asset/image-control.css?inline=true";
// @ts-expect-error inline is not supported by lint
import controlButtonCss from "@/component/shared/asset/control-button.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

/**
 * Controls laid over an image: a close cross and the size buttons, each naming the class it
 * sets on the image block. Whether they show is left to the stylesheets.
 */
class ImageControl extends HTMLElement {
    private readonly button: HTMLElement;
    private readonly sizes: HTMLElement[];

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, controlButtonCss, imageControlCss);
        shadowRoot.innerHTML = `
          <span class="be-image-control-wrapper">
            <button type="button" class="be-control-button be-image-control-button">
              <svg viewBox="0 0 18 18">
                <path class="icon-svg" d="M4,4L14,14M14,4L4,14" />
              </svg>
            </button>
            <span class="be-image-control-sizes">
              <button type="button" class="be-image-control-size" data-class="be-image-small"><span>SMALL</span></button>
              <button type="button" class="be-image-control-size" data-class="be-image-medium" data-default><span>MEDIUM</span></button>
              <button type="button" class="be-image-control-size" data-class="be-image-large"><span>LARGE</span></button>
            </span>
          </span>
        `;

        this.button = shadowRoot.querySelector(".be-image-control-button") as HTMLElement;
        this.sizes = Array.from(shadowRoot.querySelectorAll(".be-image-control-size"));
        this.hidden = true;
    }

    set onSelect(callback: () => void) {
        this.button.addEventListener("click", callback);
    }

    /** Called with the class of the size button pressed. */
    set onSize(callback: (className: string) => void) {
        for (const size of this.sizes) {
            size.addEventListener("click", () => callback(size.dataset.class as string));
        }
    }

    /** The classes the size buttons stand for. */
    get sizeClasses(): string[] {
        return this.sizes.map((size) => size.dataset.class as string);
    }

    /** Lays the control over `rect`, the image's box, so the cross sits in its top-right corner. */
    cover(rect: DOMRect) {
        this.style.left = `${rect.left}px`;
        this.style.top = `${rect.top}px`;
        this.style.width = `${rect.width}px`;
        this.style.height = `${rect.height}px`;
        this.hidden = false;
    }

    /** Marks the size button whose class the image block carries - the default one when it carries none. */
    setActive(classList: DOMTokenList) {
        const hasSize = this.sizeClasses.some((name) => classList.contains(name));
        for (const size of this.sizes) {
            const active = hasSize ? classList.contains(size.dataset.class as string) : size.hasAttribute("data-default");
            size.classList.toggle("active", active);
        }
    }

    clear() {
        this.hidden = true;
    }
}

customElements.define("be-image-control", ImageControl);

export default ImageControl;
