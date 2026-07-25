// @ts-expect-error inline is not supported by lint
import tableControlCss from "@/component/table/asset/table-control.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

const HIGHLIGHT = 2;

class TableControl extends HTMLElement {
    private readonly wrapper: HTMLElement;
    private readonly button: HTMLElement;
    private readonly highlight: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, tableControlCss);
        shadowRoot.innerHTML = `
          <span class="be-table-control-wrapper">
            <span class="be-table-control-highlight"></span>
            <button type="button" class="be-table-control-button">
              <svg viewBox="0 0 18 18">
                <path class="icon-svg" d="M8.25,8.25V3.75H9.75V8.25H14.25V9.75H9.75V14.25H8.25V9.75H3.75V8.25H8.25Z" />
              </svg>
            </button>
          </span>
        `;

        this.wrapper = shadowRoot.querySelector(".be-table-control-wrapper") as HTMLElement;
        this.button = shadowRoot.querySelector(".be-table-control-button") as HTMLElement;
        this.highlight = shadowRoot.querySelector(".be-table-control-highlight") as HTMLElement;
    }

    set onSelect(callback: () => void) {
        this.button.addEventListener("click", callback);
    }

    // Row control: "+" at the table's left edge, highlight along the horizontal border at y.
    showRow(tableRect: DOMRect, y: number) {
        this.place(this.button, tableRect.left, y);
        this.stretch(this.highlight, tableRect.left, y - HIGHLIGHT / 2, tableRect.width, HIGHLIGHT);
        this.wrapper.setAttribute("open", "");
    }

    // Column control: "+" at the table's top edge, highlight along the vertical border at x.
    showColumn(tableRect: DOMRect, x: number) {
        this.place(this.button, x, tableRect.top);
        this.stretch(this.highlight, x - HIGHLIGHT / 2, tableRect.top, HIGHLIGHT, tableRect.height);
        this.wrapper.setAttribute("open", "");
    }

    hide() {
        this.wrapper.removeAttribute("open");
    }

    private place(element: HTMLElement, x: number, y: number) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    private stretch(element: HTMLElement, left: number, top: number, width: number, height: number) {
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
    }
}

customElements.define("be-table-control", TableControl);

export default TableControl;
