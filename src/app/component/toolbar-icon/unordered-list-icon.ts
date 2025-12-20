import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {Icon} from "@/component/toolbar-icon/type/icon";

class UnorderedListIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
            <svg viewBox="0 0 18 18">
                <line class="stroke" x1="6" x2="15" y1="4" y2="4"></line>
                <line class="stroke" x1="6" x2="15" y1="9" y2="9"></line>
                <line class="stroke" x1="6" x2="15" y1="14" y2="14"></line>
                <line class="stroke" x1="3" x2="3" y1="4" y2="4"></line>
                <line class="stroke" x1="3" x2="3" y1="9" y2="9"></line>
                <line class="stroke" x1="3" x2="3" y1="14" y2="14"></line>
            </svg>
          </button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setActive(tags: string[]) {
        if (!this.button) {
            return;
        }

        if (tags[1] === "UL") {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        if (!this.button) {
            return;
        }

        this.button.addEventListener("click", () => {
            execCommand(contentEditable, {
                action: Action.FirstLevel,
                tag: ["UL", "LI"]
            });
        });
    }
}

customElements.define("unordered-list-icon", UnorderedListIcon);

export default UnorderedListIcon;