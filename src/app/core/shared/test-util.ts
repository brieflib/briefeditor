export function createWrapper(html: string) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = replaceSpaces(html);
    document.body.appendChild(wrapper);

    return wrapper;
}

export function replaceSpaces(html: string) {
    return html
        .replaceAll("\n", "")
        .replaceAll(" ", "")
        .replaceAll("class", " class")
        .replaceAll("href", " href");
}

export function getFirstChild(wrapper: HTMLElement, querySelector: string) {
    return wrapper.querySelector(querySelector)?.firstChild as Node
}

export function getLastChild(wrapper: HTMLElement, querySelector: string) {
    return wrapper.querySelector(querySelector)?.lastChild as Node
}