import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {Icon} from "@/component/toolbar-icon/type/icon";

class UnderlineIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
            <svg viewBox="0 0 18 18">
              <path class="stroke" d="M5,3V9a4.012,4.012,0,0,0,4,4H9a4.012,4.012,0,0,0,4-4V3"></path>
              <rect class="fill" height="1" rx="0.5" ry="0.5" width="12" x="3" y="15"></rect>
            </svg>
          </button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setActive(tags: string[]) {
        if (!this.button) {
            return;
        }

        if (tags.includes("U")) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        if (!this.button) {
            return;
        }

        this.button.addEventListener("click", () => execCommand({
            tag: "U",
            action: Action.Tag
        }, contentEditable));
    }
}

customElements.define("underline-icon", UnderlineIcon);

export default UnderlineIcon;