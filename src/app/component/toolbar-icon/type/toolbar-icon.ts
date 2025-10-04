interface ToolbarIcon extends HTMLElement {
    setCallback(callback: Function);
    setActive(tags: string[]);
}