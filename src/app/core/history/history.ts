import {CommandEvent} from "@/core/history/type/history-event";
import {CursorPath, HistoryEntry} from "@/core/history/type/history-record";
import {
    OBSERVER_OPTIONS,
    applyMutations,
    buildMutations,
    captureCursorPath,
    resolveCursorPath,
    revertMutations
} from "@/core/history/util/history-util";
import {getCursorPosition, setCursorPosition} from "@/core/shared/type/cursor-position";

export class History {
    private readonly contentEditable: HTMLElement;
    private readonly observer: MutationObserver;
    private readonly undoStack: HistoryEntry[] = [];
    private readonly redoStack: HistoryEntry[] = [];
    private records: MutationRecord[] = [];
    private cursorBefore: CursorPath | null = null;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;
        this.observer = new MutationObserver((records) => this.records.push(...records));

        contentEditable.addEventListener(CommandEvent.Start, () => this.start());
        contentEditable.addEventListener(CommandEvent.End, () => this.end());
        contentEditable.addEventListener("keydown", (event) => this.handleKeyboardEvent(event));
    }

    undo() {
        const entry = this.undoStack.pop();
        if (!entry) {
            return;
        }

        revertMutations(entry.mutations);
        this.restoreCursor(entry.cursorBefore);
        this.redoStack.push(entry);
    }

    redo() {
        const entry = this.redoStack.pop();
        if (!entry) {
            return;
        }

        applyMutations(entry.mutations);
        this.restoreCursor(entry.cursorAfter);
        this.undoStack.push(entry);
    }

    private start() {
        this.cursorBefore = captureCursorPath(this.contentEditable, getCursorPosition());
        this.records = [];
        this.observer.observe(this.contentEditable, OBSERVER_OPTIONS);
    }

    private end() {
        this.records.push(...this.observer.takeRecords());
        this.observer.disconnect();

        if (this.records.length === 0) {
            return;
        }

        this.undoStack.push({
            mutations: buildMutations(this.records),
            cursorBefore: this.cursorBefore,
            cursorAfter: captureCursorPath(this.contentEditable, getCursorPosition()),
        });
        this.redoStack.length = 0;
        this.records = [];
    }

    private handleKeyboardEvent(event: KeyboardEvent) {
        if (!event.ctrlKey && !event.metaKey) {
            return;
        }

        const key = event.key.toLowerCase();
        if (key === "z" && !event.shiftKey) {
            event.preventDefault();
            this.undo();
        } else if (key === "y" || (key === "z" && event.shiftKey)) {
            event.preventDefault();
            this.redo();
        }
    }

    private restoreCursor(cursorPath: CursorPath | null) {
        if (!cursorPath) {
            return;
        }

        const cursorPosition = resolveCursorPath(this.contentEditable, cursorPath);
        if (cursorPosition) {
            setCursorPosition(this.contentEditable, cursorPosition);
        }
    }
}
