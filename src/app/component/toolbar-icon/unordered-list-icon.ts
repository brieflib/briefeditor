// @ts-expect-error inline is not supported by lint
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {Icon} from "@/component/toolbar-icon/type/icon";
import {CursorPosition, isRangeIn} from "@/core/shared/type/cursor-position";
import {isLeavingListEnabled} from "@/core/list/list";

class UnorderedListIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement;
    private isActive?: boolean;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
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
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setActive(tags: string[]) {
        this.isActive = tags.includes("UL");

        if (this.isActive) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    // A cell is not a first level element, so there is no block for a list to be made of.
    setEnabled(contentEditable: HTMLElement, cursorPosition: CursorPosition, tags: string[]) {
        this.button.setAttribute("disabled", "true");

        if (!isRangeIn(contentEditable, cursorPosition) || tags.includes("TABLE")) {
            return;
        }

        // The icon is only ever refused when it would take the item out of the list, which is what the
        // active one does: the lines written below it must not be moved to another level for it.
        if (isLeavingListEnabled(contentEditable) || !this.isActive) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.button.addEventListener("click", () => {
            execCommand(contentEditable, {
                action: Action.List,
                tag: "UL"
            });
        });
    }
}

customElements.define("be-unordered-list-icon", UnorderedListIcon);

export default UnorderedListIcon;