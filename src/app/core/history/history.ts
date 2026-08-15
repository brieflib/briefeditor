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

// A stack item is a slice of time rather than a single command: everything done within this many milliseconds
// of the item's first command belongs to it. The window is anchored to that first command instead of moving
// with each new one, so an item covers at most this much editing - a window that restarted on every keystroke
// would never close while someone is typing, and the whole paragraph would come back on one undo.
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
    // When the entry on top of the undo stack was opened, or null once that entry takes no more commands.
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
        // The entry the stack is left on belongs to editing that is over, and the one redo would put back is
        // not being edited either. The next command starts an item of its own in both cases.
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

    // Listeners are appended rather than replaced: the undo and the redo icon each subscribe, and a setter
    // that assigned would leave whichever registered first without notifications.
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

    // The command is about to drop its carrier. Whatever it had already changed by now is a real edit that
    // the carrier merely tags along with; with nothing changed yet, the carrier is all this command does.
    private carrier() {
        this.records.push(...this.observer.takeRecords());
        this.carrierOnly = this.records.length === 0;
    }

    // Leaving a carrier behind splits an element around the caret and adds an empty text node - a command
    // that only does that changes the node tree without changing anything on screen.
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
        // The document moved on either way, so a pending redo would replay onto nodes that are gone.
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

    // A command that lands inside the window joins the entry that opened it rather than adding one of its own,
    // the same way a carrier joins the entry before it: the mutations run on after the ones already there, and
    // the cursor the entry redoes to moves with them while the cursor it undoes to stays where the first command
    // of the group started. The window is left anchored where it was opened, so the group closes on time.
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

    // Carrier mutations cost no undo step, but they cannot be thrown away: collapsing the block rebuilds it
    // from clones, so an entry recorded either side of them would revert onto nodes that have left the
    // document. They join the entry before them where there is one, and otherwise wait for the edit the caret
    // is waiting to make - which is what the carrier is there for - so the two are undone as the single step
    // they look like. Held mutations therefore only exist while the undo stack is empty, where there is no
    // earlier entry for them to strand.
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
