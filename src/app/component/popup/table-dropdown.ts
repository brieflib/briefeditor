// @ts-expect-error inline is not supported by lint
import tableDropdownCss from "@/component/popup/asset/table-dropdown.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

const INITIAL_ROWS = 3;
const INITIAL_COLUMNS = 3;
const MAX_ROWS = 10;
const MAX_COLUMNS = 10;
const CLOSE_DELAY = 200;

class TableDropdown extends HTMLElement {
    private readonly wrapper: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly grid: HTMLTableElement;
    private readonly onDocumentPress: EventListener;
    private target?: HTMLElement;
    private closeTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, tableDropdownCss);
        shadowRoot.innerHTML = `
          <span class="be-table-dropdown-wrapper">
            <span class="be-table-dropdown">
              <table class="be-table-dropdown-grid"></table>
            </span>
          </span>
        `;

        this.wrapper = shadowRoot.querySelector(".be-table-dropdown-wrapper") as HTMLElement;
        this.panel = shadowRoot.querySelector(".be-table-dropdown") as HTMLElement;
        this.grid = shadowRoot.querySelector(".be-table-dropdown-grid") as HTMLTableElement;

        // The dropdown lives in the icon's shadow root, so event.target is retargeted at document level.
        // Bound to touchstart as well: iOS does not bubble clicks from plain elements up to document.
        this.onDocumentPress = (event: Event) => {
            const path = event.composedPath();
            if (path.includes(this) || (this.target !== undefined && path.includes(this.target))) {
                return;
            }
            this.close();
        };

        this.panel.addEventListener("mouseleave", () => {
            this.closeTimer = setTimeout(() => this.close(), CLOSE_DELAY);
        });
        this.panel.addEventListener("mouseenter", () => {
            this.clearCloseTimer();
        });

        this.grid.addEventListener("mouseover", (event: MouseEvent) => {
            this.highlight(this.cellFromTarget(event.target));
        });
        this.grid.addEventListener("mouseleave", () => {
            this.clearHighlight();
        });
        this.grid.addEventListener("click", (event: MouseEvent) => {
            this.select(this.cellFromTarget(event.target));
        });

        // Touch: a tap has no hover, so the finger itself previews the size by dragging over
        // the grid. Touch events keep targeting where the touch started, hence the hit test.
        this.grid.addEventListener("touchstart", (event: TouchEvent) => {
            this.highlight(this.cellFromTouch(event));
        });
        this.grid.addEventListener("touchmove", (event: TouchEvent) => {
            event.preventDefault(); // sizing the grid, not scrolling the page
            this.highlight(this.cellFromTouch(event));
        }, {passive: false});
        this.grid.addEventListener("touchend", (event: TouchEvent) => {
            event.preventDefault(); // suppress the emulated mouse events and click for this tap
            this.select(this.cellFromTouch(event));
        });
    }

    open(target: HTMLElement) {
        // Closing while the pointer is over the panel leaves a mouseleave, and so a pending
        // close, queued behind us: drop it, or it would shut the dropdown we are opening.
        this.clearCloseTimer();
        this.reset();
        this.move(target);
        this.wrapper.setAttribute("open", "");
        this.target = target;
        document.addEventListener("click", this.onDocumentPress);
        document.addEventListener("touchstart", this.onDocumentPress);
    }

    close() {
        this.clearCloseTimer();
        this.wrapper.removeAttribute("open");
        document.removeEventListener("click", this.onDocumentPress);
        document.removeEventListener("touchstart", this.onDocumentPress);
    }

    isOpen(): boolean {
        return this.wrapper.hasAttribute("open");
    }

    private clearCloseTimer() {
        clearTimeout(this.closeTimer);
    }

    private move(target: HTMLElement) {
        const rect = target.getBoundingClientRect();
        this.wrapper.style.top = `${rect.bottom}px`;
        this.wrapper.style.left = `${rect.left + rect.width / 2}px`;
    }

    private reset() {
        this.grid.innerHTML = "";
        for (let row = 0; row < INITIAL_ROWS; row++) {
            this.addRow();
        }
    }

    private cellFromTarget(target: EventTarget | null): HTMLTableCellElement | null {
        return target instanceof HTMLElement ? target.closest("td") : null;
    }

    private cellFromTouch(event: TouchEvent): HTMLTableCellElement | null {
        const touch = event.changedTouches[0];
        if (!touch) {
            return null;
        }

        return this.cellFromTarget(this.shadowRoot?.elementFromPoint(touch.clientX, touch.clientY) ?? null);
    }

    private highlight(cell: HTMLTableCellElement | null) {
        if (!cell) {
            return;
        }

        const rowIndex = (cell.parentElement as HTMLTableRowElement).rowIndex;
        const columnIndex = cell.cellIndex;

        this.resize(rowIndex, columnIndex);

        for (const row of this.grid.rows) {
            for (const gridCell of row.cells) {
                gridCell.classList.toggle("highlighted", row.rowIndex <= rowIndex && gridCell.cellIndex <= columnIndex);
            }
        }
    }

    private select(cell: HTMLTableCellElement | null) {
        if (!cell) {
            return;
        }

        const rows = (cell.parentElement as HTMLTableRowElement).rowIndex + 1;
        const columns = cell.cellIndex + 1;
        console.log(rows, columns);

        this.close();
    }

    private clearHighlight() {
        for (const cell of this.grid.querySelectorAll("td.highlighted")) {
            cell.classList.remove("highlighted");
        }
    }

    private resize(rowIndex: number, columnIndex: number) {
        const rows = Math.min(Math.max(rowIndex + 2, INITIAL_ROWS), MAX_ROWS);
        while (this.grid.rows.length < rows) {
            this.addRow();
        }
        while (this.grid.rows.length > rows) {
            this.grid.deleteRow(-1);
        }

        const columns = Math.min(Math.max(columnIndex + 2, INITIAL_COLUMNS), MAX_COLUMNS);
        while (this.columnCount() < columns) {
            this.addColumn();
        }
        while (this.columnCount() > columns) {
            this.removeColumn();
        }
    }

    private columnCount(): number {
        const firstRow = this.grid.rows[0];
        return firstRow ? firstRow.cells.length : INITIAL_COLUMNS;
    }

    private addRow() {
        const columns = this.columnCount();
        const row = this.grid.insertRow();
        for (let column = 0; column < columns; column++) {
            row.insertCell();
        }
    }

    private addColumn() {
        for (const row of this.grid.rows) {
            row.insertCell();
        }
    }

    private removeColumn() {
        for (const row of this.grid.rows) {
            row.deleteCell(-1);
        }
    }
}

customElements.define("be-table-dropdown", TableDropdown);

export default TableDropdown;
