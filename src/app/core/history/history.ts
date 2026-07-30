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

export class History {
    private readonly contentEditable: HTMLElement;
    private readonly observer: MutationObserver;
    private readonly undoStack: HistoryEntry[] = [];
    private readonly redoStack: HistoryEntry[] = [];
    private records: MutationRecord[] = [];
    private cursorBefore: CursorPath | null = null;
    private carrierBefore: Text | null = null;
    private carrierOnly = false;

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
            this.foldIntoPrevious(mutations, cursorAfter);
            return;
        }

        this.undoStack.push({
            mutations: mutations,
            cursorBefore: this.cursorBefore,
            cursorAfter: cursorAfter,
        });
    }

    // Carrier mutations cost no undo step, but they cannot be thrown away: collapsing the block rebuilds it
    // from clones, so an entry recorded before would revert onto nodes that have left the document. Appending
    // them to that entry keeps the chain contiguous - reverting it walks the carrier back first, then the edit.
    // With nothing recorded yet there is no such entry to strand, and dropping them is safe.
    private foldIntoPrevious(mutations: Mutation[], cursorAfter: CursorPath | null) {
        const previous = this.undoStack[this.undoStack.length - 1];
        if (!previous) {
            return;
        }

        previous.mutations.push(...mutations);
        previous.cursorAfter = cursorAfter;
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
