import TableControl from "@/component/table/table-control";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

const THRESHOLD = 8;
const KEEP_ALIVE = 24;

interface Pending {
    mode: "insert" | "delete";
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

        this.row = this.createControl((pending) => this.applyRow(pending));
        this.column = this.createControl((pending) => this.applyColumn(pending));

        this.contentEditable.addEventListener("mousemove", (event) => this.onMouseMove(event));
        this.contentEditable.addEventListener("mouseleave", (event) => this.onMouseLeave(event));
        document.querySelector("#be-content")?.addEventListener("scroll", () => this.resetAll());
    }

    private createControl(apply: (pending: Pending) => void): ControlState {
        const control = new TableControl();
        const state: ControlState = {control, pending: null, x: 0, y: 0};
        control.onSelect = () => {
            if (state.pending) {
                apply(state.pending);
            }
            this.resetAll();
        };
        document.body.appendChild(control);
        return state;
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

        this.updateRow(event, cell, table, tableRect, rect);
        this.updateColumn(event, cell, tableRect, rect);
    }

    // Near a horizontal border -> insert control; in the middle of the cell -> delete control.
    private updateRow(event: MouseEvent, cell: HTMLTableCellElement, table: HTMLTableElement, tableRect: DOMRect, rect: DOMRect) {
        const top = Math.abs(event.clientY - rect.top);
        const bottom = Math.abs(event.clientY - rect.bottom);
        if (Math.min(top, bottom) <= THRESHOLD) {
            this.showRowInsert(event, cell, table, tableRect, rect, bottom < top);
        } else {
            this.showRowDelete(event, cell, table, tableRect, rect);
        }
    }

    private showRowInsert(event: MouseEvent, cell: HTMLTableCellElement, table: HTMLTableElement,
                          tableRect: DOMRect, rect: DOMRect, after: boolean) {
        if (cell.closest("thead") && !(after && table.rows.length <= 1)) {
            this.keepOrReset(this.row, event);
            return;
        }

        const y = after ? rect.bottom : rect.top;
        this.assign(this.row, {mode: "insert", cell, after}, tableRect.left, y);
        this.row.control.showRowInsert(tableRect, y);
    }

    private showRowDelete(event: MouseEvent, cell: HTMLTableCellElement, table: HTMLTableElement, tableRect: DOMRect, rect: DOMRect) {
        if (table.rows.length <= 1 || cell.closest("thead")) {
            this.keepOrReset(this.row, event);
            return;
        }

        const y = (rect.top + rect.bottom) / 2;
        this.assign(this.row, {mode: "delete", cell, after: false}, tableRect.left, y);
        this.row.control.showDelete(tableRect.left, y);
    }

    // Near a vertical border -> insert control; in the middle of the cell -> delete control.
    private updateColumn(event: MouseEvent, cell: HTMLTableCellElement, tableRect: DOMRect, rect: DOMRect) {
        const left = Math.abs(event.clientX - rect.left);
        const right = Math.abs(event.clientX - rect.right);
        if (Math.min(left, right) <= THRESHOLD) {
            this.showColumnInsert(cell, tableRect, rect, right < left);
        } else {
            this.showColumnDelete(cell, tableRect, rect);
        }
    }

    private showColumnInsert(cell: HTMLTableCellElement, tableRect: DOMRect, rect: DOMRect, after: boolean) {
        const x = after ? rect.right : rect.left;
        this.assign(this.column, {mode: "insert", cell, after}, x, tableRect.top);
        this.column.control.showColumnInsert(tableRect, x);
    }

    private showColumnDelete(cell: HTMLTableCellElement, tableRect: DOMRect, rect: DOMRect) {
        const x = (rect.left + rect.right) / 2;
        this.assign(this.column, {mode: "delete", cell, after: false}, x, tableRect.top);
        this.column.control.showDelete(x, tableRect.top);
    }

    private onMouseLeave(event: MouseEvent) {
        const related = event.relatedTarget as Node | null;
        if (related && (this.row.control.contains(related) || this.column.control.contains(related))) {
            return;
        }
        this.resetAll();
    }

    // Moving off a control's spot keeps it alive while the cursor is close to its button,
    // so the user can travel from the cell to the margin control and click it.
    private keepOrReset(state: ControlState, event: MouseEvent) {
        if (state.pending && Math.hypot(event.clientX - state.x, event.clientY - state.y) <= KEEP_ALIVE) {
            return;
        }
        this.reset(state);
    }

    private assign(state: ControlState, pending: Pending, x: number, y: number) {
        state.pending = pending;
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

    private applyRow(pending: Pending) {
        const action = pending.mode === "insert" ? Action.InsertRow : Action.DeleteRow;
        execCommand(this.contentEditable, {action, table: {cell: pending.cell, after: pending.after}});
    }

    private applyColumn(pending: Pending) {
        const action = pending.mode === "insert" ? Action.InsertColumn : Action.DeleteColumn;
        execCommand(this.contentEditable, {action, table: {cell: pending.cell, after: pending.after}});
    }
}
