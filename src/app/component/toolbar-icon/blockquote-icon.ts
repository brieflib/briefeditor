import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

class BlockquoteIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 1 18 18">
              <rect class="fill stroke" height="3" width="3" x="4" y="5"></rect>
              <rect class="fill stroke" height="3" width="3" x="11" y="5"></rect>
              <path class="fill stroke" d="M7,8c0,4.031-3,5-3,5"></path>
              <path class="fill stroke" d="M14,8c0,4.031-3,5-3,5"></path>
            </svg>
          </button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setActive(tags: string[]) {
        if (!this.button) {
            return;
        }

        if (tags.includes("BLOCKQUOTE")) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setEnabled(isEnabled: boolean) {
        this.button?.setAttribute("disabled", "true");

        if (isEnabled) {
            this.button?.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        if (!this.button) {
            return;
        }

        this.button.addEventListener("click", () => execCommand(contentEditable, {
            action: Action.FirstLevel,
            tag: ["BLOCKQUOTE"]
        }));
    }
}

customElements.define("blockquote-icon", BlockquoteIcon);

export default BlockquoteIcon;