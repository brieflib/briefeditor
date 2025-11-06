export interface Icon extends HTMLElement {
    setActive?(tags: string[]);
    setEnabled?();
    setContentEditable(contentEditable: HTMLElement);
}