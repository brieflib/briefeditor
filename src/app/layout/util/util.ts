export function setCss(shadowRoot: ShadowRoot, css) {
    const stylesheet = new CSSStyleSheet();
    stylesheet.replaceSync(css);
    shadowRoot.adoptedStyleSheets = [stylesheet];
}