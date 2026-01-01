import popupCss from "@/component/popup/asset/popup.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";

class Popup extends HTMLElement {
    constructor() {
        super();
        initShadowRoot(this, popupCss);
        this.shadowRoot.innerHTML = `
          <div class="backdrop"></div>
          <div class="content">
            <button class="close">×</button>
            <slot></slot>
          </div>
        `;

        this.shadowRoot.querySelector(".backdrop").addEventListener("click", () => this.close());
        this.shadowRoot.querySelector(".close").addEventListener("click", () => this.close());
    }

    static get observedAttributes() {
        return ["open"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(name, oldValue, newValue);
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