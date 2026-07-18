// @ts-expect-error inline is not supported by lint
import tableDropdownCss from "@/component/popup/asset/table-dropdown.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

const INITIAL_ROWS = 3;
const INITIAL_COLUMNS = 3;
const MAX_ROWS = 10;
const MAX_COLUMNS = 10;

class TableDropdown extends HTMLElement {
    private readonly wrapper: HTMLElement;
    private readonly grid: HTMLTableElement;

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
        this.grid = shadowRoot.querySelector(".be-table-dropdown-grid") as HTMLTableElement;

        this.grid.addEventListener("mouseover", (event: MouseEvent) => {
            this.highlight(event);
        });
        this.grid.addEventListener("mouseleave", () => {
            this.clearHighlight();
        });
        this.grid.addEventListener("click", (event: MouseEvent) => {
            this.select(event);
        });
    }

    open(target: HTMLElement) {
        this.reset();
        this.move(target);
        this.wrapper.setAttribute("open", "");
    }

    close() {
        this.wrapper.removeAttribute("open");
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

    private highlight(event: MouseEvent) {
        const cell = (event.target as HTMLElement).closest("td");
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

    private select(event: MouseEvent) {
        const cell = (event.target as HTMLElement).closest("td");
        if (!cell) {
            return;
        }

        const rows = (cell.parentElement as HTMLTableRowElement).rowIndex + 1;
        const columns = cell.cellIndex + 1;
        console.log(rows, columns);
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
