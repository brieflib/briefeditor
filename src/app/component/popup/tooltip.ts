import tooltipCss from "@/component/popup/asset/tooltip.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {getRange} from "@/core/shared/range-util";

class Tooltip extends HTMLElement {
    private readonly wrapper: HTMLElement;
    private readonly tooltip: HTMLElement;

    constructor() {
        super();
        initShadowRoot(this, tooltipCss);
        this.shadowRoot.innerHTML = `
          <span class="be-tooltip-wrapper">
            <span class="be-tooltip">
              <slot></slot>
            </span>
          </span>
        `;
        
        this.wrapper = this.shadowRoot.querySelector(".be-tooltip-wrapper") as HTMLElement;
        this.tooltip = this.shadowRoot.querySelector(".be-tooltip") as HTMLElement;
    }

    open(endOffset: number, leftPx: string) {
        const range = getRange().cloneRange();
        if (range.startContainer === range.endContainer && range.startContainer === this) {
            return;
        }

        range.setEnd(range.endContainer, endOffset);
        range.collapse(false);
        range.insertNode(this);

        this.tooltip.style.left = leftPx;
        this.wrapper.setAttribute("open", "");
    }

    close() {
        this.wrapper.removeAttribute("open");
    }
}

customElements.define("be-tooltip", Tooltip);

export default Tooltip;