import {CursorPosition} from "@/core/shared/type/cursor-position";
import {History} from "@/core/history/history";

export interface Icon extends HTMLElement {
    setActive?(tags: string[]): void;
    setEnabled?(contentEditable: HTMLElement, cursorPosition: CursorPosition, tags: string[]): void;
    setHistory?(history: History): void;
    setContentEditable(contentEditable: HTMLElement): void;
}