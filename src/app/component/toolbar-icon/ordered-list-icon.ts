// @ts-ignore
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {Icon} from "@/component/toolbar-icon/type/icon";
import {isRangeIn} from "@/core/shared/range-util";

class OrderedListIcon extends HTMLElement implements Icon {
    private contentEditableElement?: HTMLElement;
    private readonly button: HTMLElement;
    private isActive?: boolean;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `          
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 18 18">
              <line class="stroke" x1="7" x2="15" y1="4" y2="4"></line>
              <line class="stroke" x1="7" x2="15" y1="9" y2="9"></line>
              <line class="stroke" x1="7" x2="15" y1="14" y2="14"></line>
              <line class="stroke thin" x1="2.5" x2="4.5" y1="5.5" y2="5.5"></line>
              <path class="fill" d="M3.5,6A0.5,0.5,0,0,1,3,5.5V3.085l-0.276.138A0.5,0.5,0,0,1,2.053,3c-0.124-.247-0.023-0.324.224-0.447l1-.5A0.5,0.5,0,0,1,4,2.5v3A0.5,0.5,0,0,1,3.5,6Z"></path>
              <path class="stroke thin" d="M4.5,10.5h-2c0-.234,1.85-1.076,1.85-2.234A0.959,0.959,0,0,0,2.5,8.156"></path>
              <path class="stroke thin" d="M2.5,14.846a0.959,0.959,0,0,0,1.85-.109A0.7,0.7,0,0,0,3.75,14a0.688,0.688,0,0,0,.6-0.736,0.959,0.959,0,0,0-1.85-.109"></path>
            </svg>
          </button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setActive(tags: string[]) {
        this.isActive = tags.includes("OL");
        if (this.isActive) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setEnabled(isEnabled: boolean) {
        this.button.setAttribute("disabled", "true");

        if (!isRangeIn(this.contentEditableElement)) {
            return;
        }

        if (isEnabled || !this.isActive) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => {
            execCommand(contentEditable, {
                action: Action.List,
                tag: "OL"
            });
        });
    }
}

customElements.define("ordered-list-icon", OrderedListIcon);

export default OrderedListIcon;