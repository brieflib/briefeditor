import TableControl from "@/component/table/table-control";

const THRESHOLD = 8;
const KEEP_ALIVE = 24;

interface Pending {
    cell: HTMLTableCellElement;
    after: boolean;
}

interface ControlState {
    control: TableControl;
    pending: Pending | null;
    x: number;
    y: number;
}

export default class Table {
    private readonly contentEditable: HTMLElement;
    private readonly row: ControlState;
    private readonly column: ControlState;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;

        this.row = this.createControl(() => this.insert(this.row, (cell, after) => this.insertRow(cell, after)));
        this.column = this.createControl(() => this.insert(this.column, (cell, after) => this.insertColumn(cell, after)));

        this.contentEditable.addEventListener("mousemove", (event) => this.onMouseMove(event));
        this.contentEditable.addEventListener("mouseleave", (event) => this.onMouseLeave(event));
        document.querySelector("#be-content")?.addEventListener("scroll", () => this.resetAll());
    }

    private createControl(onSelect: () => void): ControlState {
        const control = new TableControl();
        control.onSelect = onSelect;
        document.body.appendChild(control);
        return {control, pending: null, x: 0, y: 0};
    }

    private onMouseMove(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        const cell = target?.closest("td, th") as HTMLTableCellElement | null;
        const table = cell?.closest("table") as HTMLTableElement | null;
        if (!cell || !table || !this.contentEditable.contains(table)) {
            this.keepOrReset(this.row, event);
            this.keepOrReset(this.column, event);
            return;
        }

        const tableRect = table.getBoundingClientRect();
        const rect = cell.getBoundingClientRect();

        // Horizontal and vertical proximity are evaluated independently, so near a
        // border cross both the row and column controls appear at once.
        // The header row (thead) is skipped: rows are only inserted around the body.
        const top = Math.abs(event.clientY - rect.top);
        const bottom = Math.abs(event.clientY - rect.bottom);
        if (!cell.closest("thead") && Math.min(top, bottom) <= THRESHOLD) {
            const after = bottom < top;
            this.show(this.row, cell, after, tableRect.left, after ? rect.bottom : rect.top);
            this.row.control.showRow(tableRect, after ? rect.bottom : rect.top);
        } else {
            this.keepOrReset(this.row, event);
        }

        const left = Math.abs(event.clientX - rect.left);
        const right = Math.abs(event.clientX - rect.right);
        if (Math.min(left, right) <= THRESHOLD) {
            const after = right < left;
            this.show(this.column, cell, after, after ? rect.right : rect.left, tableRect.top);
            this.column.control.showColumn(tableRect, after ? rect.right : rect.left);
        } else {
            this.keepOrReset(this.column, event);
        }
    }

    private onMouseLeave(event: MouseEvent) {
        const related = event.relatedTarget as Node | null;
        if (related && (this.row.control.contains(related) || this.column.control.contains(related))) {
            return;
        }
        this.resetAll();
    }

    // Moving off a border keeps a control alive while the cursor is close to its "+",
    // so the user can travel from the border to the margin control and click it.
    private keepOrReset(state: ControlState, event: MouseEvent) {
        if (state.pending && Math.hypot(event.clientX - state.x, event.clientY - state.y) <= KEEP_ALIVE) {
            return;
        }
        this.reset(state);
    }

    private show(state: ControlState, cell: HTMLTableCellElement, after: boolean, x: number, y: number) {
        state.pending = {cell, after};
        state.x = x;
        state.y = y;
    }

    private reset(state: ControlState) {
        state.pending = null;
        state.control.hide();
    }

    private resetAll() {
        this.reset(this.row);
        this.reset(this.column);
    }

    private insert(state: ControlState, apply: (cell: HTMLTableCellElement, after: boolean) => void) {
        if (state.pending) {
            apply(state.pending.cell, state.pending.after);
        }
        this.resetAll();
    }

    private insertRow(cell: HTMLTableCellElement, after: boolean) {
        const referenceRow = cell.parentElement as HTMLTableRowElement;
        const section = referenceRow.parentElement;
        if (!section) {
            return;
        }

        const newRow = document.createElement("tr");
        for (const referenceCell of referenceRow.cells) {
            const newCell = document.createElement(referenceCell.tagName === "TH" ? "th" : "td");
            newCell.appendChild(document.createElement("br"));
            newRow.appendChild(newCell);
        }

        section.insertBefore(newRow, after ? referenceRow.nextSibling : referenceRow);
    }

    private insertColumn(cell: HTMLTableCellElement, after: boolean) {
        const table = cell.closest("table") as HTMLTableElement | null;
        if (!table) {
            return;
        }

        const columnIndex = cell.cellIndex + (after ? 1 : 0);
        for (const row of table.rows) {
            const insertIndex = Math.min(columnIndex, row.cells.length);
            const reference = row.cells[insertIndex] ?? null;
            const isHeaderRow = row.cells[0]?.tagName === "TH";
            const newCell = document.createElement(isHeaderRow ? "th" : "td");
            newCell.appendChild(document.createElement("br"));
            row.insertBefore(newCell, reference);
        }
    }
}
