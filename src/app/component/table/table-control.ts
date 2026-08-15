// @ts-expect-error inline is not supported by lint
import tableControlCss from "@/component/table/asset/table-control.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

const HIGHLIGHT = 1;

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
            <button type="button" class="be-table-control-button" data-icon="plus">
              <svg class="plus" viewBox="0 0 18 18">
                <path class="icon-svg" d="M8.25,8.25V3.75H9.75V8.25H14.25V9.75H9.75V14.25H8.25V9.75H3.75V8.25H8.25Z" />
              </svg>
              <svg class="minus" viewBox="0 0 18 18">
                <path class="icon-svg" d="M3.75,8.25H14.25V9.75H3.75Z" />
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

    // A fade cut short reports itself as a cancel instead, so this only runs once the control
    // has actually gone, which is where the state behind it stops being worth keeping.
    set onFadeEnd(callback: () => void) {
        this.button.addEventListener("animationend", callback);
    }

    // Insert row: "+" at the table's left edge, highlight along the horizontal border at y.
    showRowInsert(tableRect: DOMRect, y: number) {
        this.icon("plus");
        this.place(this.button, tableRect.left, y);
        this.stretch(this.highlight, tableRect.left, y - HIGHLIGHT / 2, tableRect.width, HIGHLIGHT);
        this.highlight.style.display = "";
        this.open();
    }

    // Insert column: "+" at the table's top edge, highlight along the vertical border at x.
    showColumnInsert(tableRect: DOMRect, x: number) {
        this.icon("plus");
        this.place(this.button, x, tableRect.top);
        this.stretch(this.highlight, x - HIGHLIGHT / 2, tableRect.top, HIGHLIGHT, tableRect.height);
        this.highlight.style.display = "";
        this.open();
    }

    // Delete: "-" at the table edge, centered on the selected row/column (no border highlight).
    showDelete(x: number, y: number) {
        this.icon("minus");
        this.place(this.button, x, y);
        this.highlight.style.display = "none";
        this.open();
    }

    // Hands the control over to the fade in the stylesheet: it holds where it is, then goes.
    fade() {
        this.wrapper.removeAttribute("fade");
        this.wrapper.removeAttribute("open");
        this.restart();
        this.wrapper.setAttribute("fade", "");
    }

    hide() {
        this.wrapper.removeAttribute("fade");
        this.wrapper.removeAttribute("open");
    }

    private open() {
        this.wrapper.removeAttribute("fade");
        this.wrapper.setAttribute("open", "");
    }

    // Reading the layout commits the attribute just dropped, so that putting it back counts as a
    // new fade rather than one already part way through from wherever the control was last shown.
    private restart() {
        void this.wrapper.offsetWidth;
    }

    private icon(kind: "plus" | "minus") {
        this.button.setAttribute("data-icon", kind);
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
