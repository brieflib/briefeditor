// @ts-ignore
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {isRangeIn} from "@/core/shared/range-util";

class ItalicIcon extends HTMLElement implements Icon {
    private contentEditableElement?: HTMLElement;
    private readonly button: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 18 18">
              <line class="stroke" x1="7" x2="13" y1="4" y2="4"></line>
              <line class="stroke" x1="5" x2="11" y1="14" y2="14"></line>
              <line class="stroke" x1="8" x2="10" y1="14" y2="4"></line>
            </svg>
          </button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setActive(tags: string[]) {
        if (tags.includes("EM")) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setEnabled() {
        this.button.setAttribute("disabled", "true");

        if (isRangeIn(this.contentEditableElement)) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => execCommand(contentEditable, {
            action: Action.Tag,
            tag: "EM"
        }));
    }
}

customElements.define("be-italic-icon", ItalicIcon);

export default ItalicIcon;