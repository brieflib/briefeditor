import {CursorPosition} from "@/core/shared/type/cursor-position";

export interface Icon extends HTMLElement {
    setActive?(tags: string[]): void;
    setEnabled?(contentEditable: HTMLElement, cursorPosition: CursorPosition, tags: string[]): void;
    setContentEditable(contentEditable: HTMLElement): void;
}