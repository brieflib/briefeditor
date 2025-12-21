export interface Icon extends HTMLElement {
    setActive?(tags: string[]);
    setEnabled?(isEnabled: boolean);
    setContentEditable(contentEditable: HTMLElement);
}