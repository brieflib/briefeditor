// @ts-expect-error inline is not supported by lint
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import {isRangeIn} from "@/core/shared/type/cursor-position";
import {History} from "@/core/history/history";

class UndoIcon extends HTMLElement implements Icon {
    private contentEditableElement?: HTMLElement;
    private history?: History;
    private readonly button: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 24 24">
              <path d="M4 9V14H9M20 16C19.5026 11.5 16.6326 8 12 8C9.27084 8 6.07142 10.2681 4.70591 13.5" class="stroke" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }

    setEnabled() {
        this.button.setAttribute("disabled", "true");

        if (this.history?.canUndo() && isRangeIn(this.contentEditableElement)) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => this.history?.undo());
    }

    // The selection sweep alone would leave the icon stale: an edit that keeps the cursor where it is raises no
    // selectionchange, and the stack still moved.
    setHistory(history: History) {
        this.history = history;

        history.onChange(() => this.setEnabled());
    }
}

customElements.define("be-undo-icon", UndoIcon);

export default UndoIcon;