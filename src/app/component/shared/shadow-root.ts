export default function initShadowRoot(element: HTMLElement, ...css: string[]) {
    const shadowRoot = element.attachShadow({mode: 'open'});
    const stylesheets = [];
    for (const style of css) {
        const stylesheet = new CSSStyleSheet();
        if (stylesheet.replaceSync) {
            stylesheet.replaceSync(style);
            stylesheets.push(stylesheet);
        }
    }

    shadowRoot.adoptedStyleSheets = stylesheets;

    if (!element.shadowRoot) {
        throw new Error("Error initializing shadowRoot");
    }

    return element.shadowRoot;
}