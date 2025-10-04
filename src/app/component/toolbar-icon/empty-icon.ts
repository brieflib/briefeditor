import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

class EmptyIcon extends HTMLElement implements ToolbarIcon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="empty-icon" id="button"></button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setActive(tags: string[]) {
    }

    setCallback(callback) {
    }
}

customElements.define("empty-icon", EmptyIcon);

export default EmptyIcon;