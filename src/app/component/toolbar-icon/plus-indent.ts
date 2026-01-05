// @ts-ignore
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {isPlusIndentEnabled} from "@/core/list/list";

class PlusIndentIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement;
    private contentEditableElement?: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 18 18">
              <line class="stroke" x1="3" x2="15" y1="14" y2="14"></line>
              <line class="stroke" x1="3" x2="15" y1="4" y2="4"></line>
              <line class="stroke" x1="9" x2="15" y1="9" y2="9"></line>
              <polyline class="fill stroke" points="3 7 3 11 5 9 3 7"></polyline>
            </svg>
          </button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setEnabled() {
        this.button.setAttribute("disabled", "true");

        if (this.contentEditableElement && isPlusIndentEnabled(this.contentEditableElement)) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => execCommand(contentEditable, {
            action: Action.PlusIndent
        }));
    }
}

customElements.define("plus-indent-icon", PlusIndentIcon);

export default PlusIndentIcon;