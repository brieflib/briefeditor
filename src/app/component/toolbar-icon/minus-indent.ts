import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

class MinusIndentIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
            <svg viewBox="0 0 18 18">
              <line class="stroke" x1="3" x2="15" y1="14" y2="14"></line>
              <line class="stroke" x1="3" x2="15" y1="4" y2="4"></line>
              <line class="stroke" x1="9" x2="15" y1="9" y2="9"></line>
              <polyline class="stroke" points="5 7 5 11 3 9 5 7"></polyline>
            </svg>
          </button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setContentEditable(contentEditable: HTMLElement) {
        if (!this.button) {
            return;
        }

        this.button.addEventListener("click", () => execCommand({
            action: Action.PlusIndent
        }, contentEditable));
    }
}

customElements.define("minus-indent-icon", MinusIndentIcon);

export default MinusIndentIcon;