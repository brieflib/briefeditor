import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

class ItalicIcon extends HTMLElement implements ToolbarIcon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
            <svg viewBox="0 0 18 18">
              <line class="stroke" x1="7" x2="13" y1="4" y2="4"></line>
              <line class="stroke" x1="5" x2="11" y1="14" y2="14"></line>
              <line class="stroke" x1="8" x2="10" y1="14" y2="4"></line>
            </svg>
          </button>
        `;
        this.button = this.shadowRoot.getElementById("button");
    }

    setActive(tags: string[]) {
        if (!this.button) {
            return;
        }

        if (tags.includes("EM")) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setCallback(callback) {
        if (!this.button) {
            return;
        }

        this.button.addEventListener("click", callback);
    }
}

customElements.define("italic-icon", ItalicIcon);

export default ItalicIcon;