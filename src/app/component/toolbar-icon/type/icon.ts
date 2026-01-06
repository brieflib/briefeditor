export interface Icon extends HTMLElement {
    setActive?(tags: string[]): void;
    setEnabled?(isEnabled?: boolean): void;
    setContentEditable(contentEditable: HTMLElement): void;
}