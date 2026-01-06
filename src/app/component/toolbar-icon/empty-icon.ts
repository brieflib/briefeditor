// @ts-ignore
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

class EmptyIcon extends HTMLElement {
    private readonly button?: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="empty-icon" id="button"></button>
        `;
        this.button = shadowRoot.getElementById("button") as HTMLElement;
    }
}

customElements.define("be-empty-icon", EmptyIcon);

export default EmptyIcon;