export default function initShadowRoot(element: HTMLElement, ...css: string[]) {
    const shadowRoot = element.attachShadow({mode: 'open'});
    const stylesheets = [];
    for (const style of css) {
        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(style);
        stylesheets.push(stylesheet);
    }

    shadowRoot.adoptedStyleSheets = stylesheets;
}