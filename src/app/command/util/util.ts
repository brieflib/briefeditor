export function getFirstLevelElement(container: HTMLElement, child: HTMLElement) {
    let element: HTMLElement = child;

    while (child !== container) {
        element = child;
        if (!child.parentElement) {
            return element;
        }
        child = child.parentElement;
    }

    return element;
}