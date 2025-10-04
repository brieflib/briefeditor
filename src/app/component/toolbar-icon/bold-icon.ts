import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

class BoldIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
              <svg viewBox="0 0 18 18">
                 <path class="stroke" d="M5,4H9.5A2.5,2.5,0,0,1,12,6.5v0A2.5,2.5,0,0,1,9.5,9H5A0,0,0,0,1,5,9V4A0,0,0,0,1,5,4Z"></path>
                 <path class="stroke" d="M5,9h5.5A2.5,2.5,0,0,1,13,11.5v0A2.5,2.5,0,0,1,10.5,14H5a0,0,0,0,1,0,0V9A0,0,0,0,1,5,9Z"></path>
              </svg>
          </button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setActive(tags: string[]) {
        if (!this.button) {
            return;
        }

        if (tags.includes("STRONG")) {
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
            tag: "STRONG",
            action: Action.Tag
        }, contentEditable));
    }
}

customElements.define("bold-icon", BoldIcon);

export default BoldIcon;