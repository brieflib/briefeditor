// @ts-ignore
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import {getRange, isRangeIn} from "@/core/shared/range-util";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

class ImageIcon extends HTMLElement implements Icon {
    private contentEditableElement?: HTMLElement;
    private readonly button: HTMLElement;
    private readonly input: HTMLInputElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 18 18">
                <rect class="stroke" height="10" width="12" x="3" y="4"></rect>
                <circle class="fill" cx="6" cy="7" r="1"></circle>
                <polyline class="fill" points="5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12"></polyline>
            </svg>
          </button>
          <input type="file" class="be-image-input" accept="image/*">
        `;

        this.button = shadowRoot.getElementById("button") as HTMLElement;
        this.input = shadowRoot.querySelector(".be-image-input") as HTMLInputElement;
    }

    setEnabled() {
        this.button.setAttribute("disabled", "true");

        if (isRangeIn(this.contentEditableElement)) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => {
            this.input.click();
        });

        this.input.addEventListener("change", (event) => {
            const element = event.target as HTMLInputElement;
            const files = element.files;
            if (!files) {
                return;
            }
            const image = files[0];
            execCommand(contentEditable, {
                action: Action.Image,
                tag: "IMG",
                attributes: {
                    image: image as Blob
                }
            });
            this.input.value = "";
        });
    }
}

customElements.define("be-image-icon", ImageIcon);

export default ImageIcon;