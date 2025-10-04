export default function initShadowRoot(element: HTMLElement, css: string) {
    const shadowRoot = element.attachShadow({mode: 'open'});
    const stylesheet = new CSSStyleSheet();
    stylesheet.replaceSync(css);
    shadowRoot.adoptedStyleSheets = [stylesheet];
}