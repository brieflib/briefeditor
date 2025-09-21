import toolbarItemCss from "@/layout/css/toolbar-item.css?inline=true";
import {setCss} from "@/layout/util/util";

class ToolbarItem extends HTMLElement {
    private icon: HTMLElement;
    private className: string;

    constructor() {
        super();
        const shadowRoot = this.attachShadow({mode: 'open'});
        setCss(shadowRoot, toolbarItemCss);
        this.shadowRoot.innerHTML = `
          <div id="toolbar-item"></div>
        `;
    }

    setItem(iconName, callback) {
        const icon = document.createElement("div");
        icon.className = iconName;
        icon.onclick = callback;
        this.shadowRoot.getElementById("toolbar-item").appendChild(icon);

        this.icon = icon;
        this.className = iconName;
    }

    setActive(isActive: boolean) {
        if (isActive) {
            this.icon.className = this.className + " active";
        } else {
            this.icon.className = this.className;
        }
    }
}

customElements.define("toolbar-item", ToolbarItem);

export default ToolbarItem;