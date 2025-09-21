import toolbarItemCss from "@/layout/css/toolbar-item.css?inline=true";
import strong from "@/layout/svg/strong.svg";
import {setCss} from "@/layout/util/util";

class ToolbarItem extends HTMLElement {
    iconMap: Map<string, string> = new Map<string, string>();

    constructor() {
        super();
        const shadowRoot = this.attachShadow({mode: 'open'});
        setCss(shadowRoot, toolbarItemCss);
        this.shadowRoot.innerHTML = `
          <div id="toolbar-item"></div>
        `;

        this.fillIconMap();
    }

    fillIconMap() {
        this.iconMap.set("strong", strong);
    }

    setItem(iconName, callback) {
        const imgElement = document.createElement("img");
        imgElement.className = "icon";
        const icon = this.iconMap.get(iconName);
        if (icon) {
            imgElement.src = icon;
            imgElement.onclick = callback;
            this.shadowRoot.getElementById("toolbar-item").appendChild(imgElement);
        }
    }
}

customElements.define("toolbar-item", ToolbarItem);

export default ToolbarItem;