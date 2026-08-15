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

        // Pointer events rather than mouse events, so that the mouse ones a touch has the browser
        // emulate afterwards go unheard: they would reopen a control the touch path just faded.
        this.contentEditable.addEventListener("pointermove", (event) => this.onHover(event));
        this.contentEditable.addEventListener("pointerleave", (event) => this.onHoverLeave(event));
        this.contentEditable.addEventListener("pointerdown", (event) => this.onPress(event), {passive: true});
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
        control.onFadeEnd = () => {
            state.pending = null;
        };
        document.body.appendChild(control);
        return state;
    }

    private onHover(event: PointerEvent) {
        if (event.pointerType !== "mouse") {
            return;
        }
        this.update(event.target, event.clientX, event.clientY);
    }

    // A touch has no hover to show the control through, so the press itself shows it and the
    // control then times itself out, staying clickable long enough to travel to and press.
    private onPress(event: PointerEvent) {
        if (event.pointerType === "mouse") {
            return;
        }

        this.update(event.target, event.clientX, event.clientY);
        this.fade(this.row);
        this.fade(this.column);
    }

    private update(target: EventTarget | null, x: number, y: number) {
        const cell = (target as HTMLElement | null)?.closest("td, th") as HTMLTableCellElement | null;
        const table = cell?.closest("table") as HTMLTableElement | null;
        if (!cell || !table || !this.contentEditable.contains(table)) {
            this.keepOrReset(this.row, x, y);
            this.keepOrReset(this.column, x, y);
            return;
        }

        const tableRect = table.getBoundingClientRect();
        const rect = cell.getBoundingClientRect();

        this.updateRow(x, y, cell, table, tableRect, rect);
        this.updateColumn(x, cell, tableRect, rect);
    }

    private fade(state: ControlState) {
        if (state.pending) {
            state.control.fade();
        }
    }

    // Near a horizontal border -> insert control; in the middle of the cell -> delete control.
    private updateRow(x: number, y: number, cell: HTMLTableCellElement, table: HTMLTableElement, tableRect: DOMRect, rect: DOMRect) {
        const top = Math.abs(y - rect.top);
        const bottom = Math.abs(y - rect.bottom);
        if (Math.min(top, bottom) <= THRESHOLD) {
            this.showRowInsert(x, y, cell, table, tableRect, rect, bottom < top);
        } else {
            this.showRowDelete(x, y, cell, table, tableRect, rect);
        }
    }

    private showRowInsert(x: number, y: number, cell: HTMLTableCellElement, table: HTMLTableElement,
                          tableRect: DOMRect, rect: DOMRect, after: boolean) {
        if (cell.closest("thead") && !(after && table.rows.length <= 1)) {
            this.keepOrReset(this.row, x, y);
            return;
        }

        const border = after ? rect.bottom : rect.top;
        this.assign(this.row, {mode: "insert", cell, after}, tableRect.left, border);
        this.row.control.showRowInsert(tableRect, border);
    }

    private showRowDelete(x: number, y: number, cell: HTMLTableCellElement, table: HTMLTableElement, tableRect: DOMRect, rect: DOMRect) {
        // Body rows are deletable while more than one row is left; a header row only when it is the
        // last one, where deleting it removes the whole table.
        const deletable = cell.closest("thead") ? table.rows.length === 1 : table.rows.length > 1;
        if (!deletable) {
            this.keepOrReset(this.row, x, y);
            return;
        }

        const middle = (rect.top + rect.bottom) / 2;
        this.assign(this.row, {mode: "delete", cell, after: false}, tableRect.left, middle);
        this.row.control.showDelete(tableRect.left, middle);
    }

    // Near a vertical border -> insert control; in the middle of the cell -> delete control.
    private updateColumn(x: number, cell: HTMLTableCellElement, tableRect: DOMRect, rect: DOMRect) {
        const left = Math.abs(x - rect.left);
        const right = Math.abs(x - rect.right);
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

    private onHoverLeave(event: PointerEvent) {
        if (event.pointerType !== "mouse") {
            return;
        }

        const related = event.relatedTarget as Node | null;
        if (related && (this.row.control.contains(related) || this.column.control.contains(related))) {
            return;
        }
        this.resetAll();
    }

    // Moving off a control's spot keeps it alive while the cursor is close to its button,
    // so the user can travel from the cell to the margin control and click it.
    private keepOrReset(state: ControlState, x: number, y: number) {
        if (state.pending && Math.hypot(x - state.x, y - state.y) <= KEEP_ALIVE) {
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
