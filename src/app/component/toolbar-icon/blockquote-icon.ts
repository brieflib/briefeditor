// @ts-expect-error inline is not supported by lint
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {isNextListNested} from "@/core/list/list";
import {CursorPosition, isRangeIn} from "@/core/shared/type/cursor-position";

class BlockquoteIcon extends HTMLElement implements Icon {
    private readonly button: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 1 18 18">
              <rect class="fill stroke" height="3" width="3" x="4" y="5"></rect>
              <rect class="fill stroke" height="3" width="3" x="11" y="5"></rect>
              <path class="fill stroke" d="M7,8c0,4.031-3,5-3,5"></path>
              <path class="fill stroke" d="M14,8c0,4.031-3,5-3,5"></path>
            </svg>
          </button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setActive(tags: string[]) {
        if (tags.includes("BLOCKQUOTE")) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setEnabled(contentEditable: HTMLElement, cursorPosition: CursorPosition, tags: string[]) {
        this.button.setAttribute("disabled", "true");

        // A cell is not a first level element, so there is no block for a quote to be made of.
        if (tags.includes("TABLE")) {
            return;
        }

        if (!isNextListNested(contentEditable) && isRangeIn(contentEditable, cursorPosition)) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.button.addEventListener("click", () => execCommand(contentEditable, {
            action: Action.FirstLevel,
            tag: "BLOCKQUOTE"
        }));
    }
}

customElements.define("be-blockquote-icon", BlockquoteIcon);

export default BlockquoteIcon;