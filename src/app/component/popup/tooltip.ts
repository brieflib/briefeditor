// @ts-ignore
import tooltipCss from "@/component/popup/asset/tooltip.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {getRange} from "@/core/shared/range-util";

class Tooltip extends HTMLElement {
    private readonly wrapper: HTMLElement;
    private readonly tooltip: HTMLElement;
    private readonly scrollContainer: HTMLElement;
    private readonly onScroll: EventListener;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, tooltipCss);
        shadowRoot.innerHTML = `
          <span class="be-tooltip-wrapper">
            <span class="be-tooltip">
              <slot></slot>
            </span>
          </span>
        `;

        this.wrapper = shadowRoot.querySelector(".be-tooltip-wrapper") as HTMLElement;
        this.tooltip = shadowRoot.querySelector(".be-tooltip") as HTMLElement;
        this.scrollContainer = document.querySelector("#be-content") as HTMLElement;

        this.onScroll = () => {
            this.move();
        };
    }

    open() {
        const range = getRange();
        if (range.startContainer === range.endContainer && range.startContainer === this) {
            return;
        }

        this.move();
        this.wrapper.setAttribute("open", "");
        this.scrollContainer.addEventListener("scroll", this.onScroll);
    }

    close() {
        this.wrapper.removeAttribute("open");
        this.scrollContainer.removeEventListener("scroll", this.onScroll);
    }

    private move() {
        const range = getRange();
        const rect = range.getBoundingClientRect();
        this.wrapper.style.top = `${rect.top}px`;
        this.wrapper.style.left = `${rect.left + rect.width / 2}px`;
    }
}

customElements.define("be-tooltip", Tooltip);

export default Tooltip;