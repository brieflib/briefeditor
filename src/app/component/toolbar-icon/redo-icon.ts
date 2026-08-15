// @ts-expect-error inline is not supported by lint
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import {isRangeIn} from "@/core/shared/type/cursor-position";
import {History} from "@/core/history/history";

class RedoIcon extends HTMLElement implements Icon {
    private contentEditableElement?: HTMLElement;
    private history?: History;
    private readonly button: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 24 24">
              <path d="M20 9V14H15M4 16C4.49744 11.5 7.36745 8 12 8C14.7292 8 17.9286 10.2681 19.2941 13.5" class="stroke" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setEnabled() {
        this.button.setAttribute("disabled", "true");

        if (this.history?.canRedo() && isRangeIn(this.contentEditableElement)) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => this.history?.redo());
    }

    // The selection sweep alone would leave the icon stale: an edit that keeps the cursor where it is raises no
    // selectionchange, and the stack still moved.
    setHistory(history: History) {
        this.history = history;

        history.onChange(() => this.setEnabled());
    }
}

customElements.define("be-redo-icon", RedoIcon);

export default RedoIcon;