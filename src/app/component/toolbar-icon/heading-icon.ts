import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

class HeadingIcon extends HTMLElement implements ToolbarIcon {
    private readonly button: HTMLElement | null;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
              <svg viewBox="0 3 22 22" xmlns="http://www.w3.org/2000/svg">
                <path class="icon-svg" d="M7 5C7.55228 5 8 5.44772 8 6V11.5H16V6C16 5.44772 16.4477 5 17 5C17.5523 5 18 5.44772 18 6V12.5V19C18 19.5523 17.5523 20 17 20C16.4477 20 16 19.5523 16 19V13.5H8V19C8 19.5523 7.55228 20 7 20C6.44772 20 6 19.5523 6 19V12.5V6C6 5.44772 6.44772 5 7 5Z"/>
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

customElements.define("heading-icon", HeadingIcon);

export default HeadingIcon;