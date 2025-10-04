export function getFirstLevelElement(findTill: HTMLElement, child: HTMLElement) {
    let element: HTMLElement = child;

    while (child !== findTill) {
        element = child;
        if (!child.parentElement) {
            return element;
        }
        child = child.parentElement;
    }

    return element;
}