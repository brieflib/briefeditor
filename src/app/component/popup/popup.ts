// @ts-ignore
import popupCss from "@/component/popup/asset/popup.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

class Popup extends HTMLElement {
    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, popupCss);
        shadowRoot.innerHTML = `
          <div class="backdrop"></div>
          <div class="content">
            <button class="close">×</button>
            <slot></slot>
          </div>
        `;

        shadowRoot.querySelector(".backdrop")?.addEventListener("click", () => this.close());
        shadowRoot.querySelector(".close")?.addEventListener("click", () => this.close());
    }

    static get observedAttributes() {
        return ["open"];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === "open") {
            document.body.style.overflow = newValue !== null ? "hidden" : "";
        }
    }

    open() {
        this.setAttribute("open", "");
    }

    close() {
        this.removeAttribute("open");
    }
}

customElements.define("be-popup", Popup);

export default Popup;