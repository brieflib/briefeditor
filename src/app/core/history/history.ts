import {CommandEvent} from "@/core/history/type/history-event";
import {Carrier} from "@/core/carrier/carrier";
import {CursorPath, HistoryEntry, Mutation} from "@/core/history/type/history-record";
import {
    OBSERVER_OPTIONS,
    applyMutations,
    buildMutations,
    captureCursorPath,
    resolveCursorPath,
    revertMutations
} from "@/core/history/util/history-util";
import {getCursorPosition, setCursorPosition} from "@/core/shared/type/cursor-position";

/**
 * How many milliseconds after an undo entry's first command later commands still join it,
 * rather than opening an entry of their own. Anchored to that first command rather than
 * sliding with each new one, so an entry covers at most this much editing - a sliding
 * window would never close while someone kept typing, undoing a whole paragraph at once.
 */
export const GROUP_INTERVAL = 300;

export class History {
    private readonly contentEditable: HTMLElement;
    private readonly observer: MutationObserver;
    private readonly undoStack: HistoryEntry[] = [];
    private readonly redoStack: HistoryEntry[] = [];
    private records: MutationRecord[] = [];
    private cursorBefore: CursorPath | null = null;
    private carrierBefore: Text | null = null;
    private carrierOnly = false;
    private carrierMutations: Mutation[] = [];
    private carrierCursorBefore: CursorPath | null = null;
    /** When the top undo entry was opened, or null once it stops accepting more commands. */
    private groupStart: number | null = null;
    private readonly changeListeners: (() => void)[] = [];

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;
        this.observer = new MutationObserver((records) => this.records.push(...records));

        contentEditable.addEventListener(CommandEvent.Start, () => this.start());
        contentEditable.addEventListener(CommandEvent.Carrier, () => this.carrier());
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
        // Neither the entry left on top nor the one just moved to redo is being actively
        // edited, so the next command should always start an entry of its own.
        this.groupStart = null;
        this.notifyChange();
    }

    redo() {
        const entry = this.redoStack.pop();
        if (!entry) {
            return;
        }

        applyMutations(entry.mutations);
        this.restoreCursor(entry.cursorAfter);
        this.undoStack.push(entry);
        this.groupStart = null;
        this.notifyChange();
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    // Appended rather than replaced, since both the undo and redo icon subscribe.
    onChange(listener: () => void) {
        this.changeListeners.push(listener);
    }

    private notifyChange() {
        for (const listener of this.changeListeners) {
            listener();
        }
    }

    private start() {
        this.cursorBefore = captureCursorPath(this.contentEditable, getCursorPosition());
        this.carrierBefore = Carrier.getCarrier();
        this.carrierOnly = false;
        this.records = [];
        this.observer.observe(this.contentEditable, OBSERVER_OPTIONS);
    }

    /** Called just before the command drops its carrier. No mutations yet means the carrier is all this command does. */
    private carrier() {
        this.records.push(...this.observer.takeRecords());
        this.carrierOnly = this.records.length === 0;
    }

    /** Whether the command did nothing but leave a carrier (splitting an element around the caret with an empty text node) - a change to the tree, not the screen. */
    private isCarrierOnly() {
        const carrier = Carrier.getCarrier();
        if (carrier) {
            return carrier !== this.carrierBefore;
        }

        return this.carrierOnly;
    }

    private end() {
        this.records.push(...this.observer.takeRecords());
        this.observer.disconnect();

        if (this.records.length === 0) {
            return;
        }

        const mutations = buildMutations(this.records);
        const cursorAfter = captureCursorPath(this.contentEditable, getCursorPosition());
        this.records = [];
        // The document moved on, so a pending redo would replay onto nodes that are gone.
        this.redoStack.length = 0;

        if (this.isCarrierOnly()) {
            this.holdCarrier(mutations, cursorAfter);
            this.notifyChange();
            return;
        }

        this.record(mutations, cursorAfter);
        this.carrierMutations = [];
        this.carrierCursorBefore = null;
        this.notifyChange();
    }

    /**
     * Appends `mutations` to the undo stack, joining the top entry if it's still within
     * {@link GROUP_INTERVAL} of when it opened (its `cursorBefore` stays put; `cursorAfter`
     * moves forward), otherwise opening a new entry.
     */
    private record(mutations: Mutation[], cursorAfter: CursorPath | null) {
        const now = Date.now();
        const previous = this.undoStack[this.undoStack.length - 1];
        if (previous && this.groupStart !== null && now - this.groupStart < GROUP_INTERVAL) {
            previous.mutations.push(...this.carrierMutations, ...mutations);
            previous.cursorAfter = cursorAfter;
            return;
        }

        this.undoStack.push({
            mutations: [...this.carrierMutations, ...mutations],
            cursorBefore: this.carrierMutations.length > 0 ? this.carrierCursorBefore : this.cursorBefore,
            cursorAfter: cursorAfter,
        });
        this.groupStart = now;
    }

    /**
     * Folds carrier-only mutations into the entry before them so they undo as a single step
     * with the edit the carrier exists to enable, rather than costing an undo step of their
     * own. With no earlier entry to join, they're held in `carrierMutations` until the
     * command the carrier is waiting for is recorded.
     */
    private holdCarrier(mutations: Mutation[], cursorAfter: CursorPath | null) {
        const previous = this.undoStack[this.undoStack.length - 1];
        if (previous) {
            previous.mutations.push(...mutations);
            previous.cursorAfter = cursorAfter;
            return;
        }

        if (this.carrierMutations.length === 0) {
            this.carrierCursorBefore = this.cursorBefore;
        }
        this.carrierMutations.push(...mutations);
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
