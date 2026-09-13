// @ts-expect-error inline is not supported by lint
import imageControlCss from "@/component/image/asset/image-control.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

/** A close cross laid over an image; whether it shows is left to the stylesheets. */
class ImageControl extends HTMLElement {
    private readonly button: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, imageControlCss);
        shadowRoot.innerHTML = `
          <button type="button" class="be-image-control-button">
            <svg viewBox="0 0 18 18">
              <path class="icon-svg" d="M4,4L14,14M14,4L4,14" />
            </svg>
          </button>
        `;

        this.button = shadowRoot.querySelector(".be-image-control-button") as HTMLElement;
        this.hidden = true;
    }

    set onSelect(callback: () => void) {
        this.button.addEventListener("click", callback);
    }

    /** Lays the control over `rect`, the image's box, so the cross sits in its top-right corner. */
    cover(rect: DOMRect) {
        this.style.left = `${rect.left}px`;
        this.style.top = `${rect.top}px`;
        this.style.width = `${rect.width}px`;
        this.style.height = `${rect.height}px`;
        this.hidden = false;
    }

    clear() {
        this.hidden = true;
    }
}

customElements.define("be-image-control", ImageControl);

export default ImageControl;
