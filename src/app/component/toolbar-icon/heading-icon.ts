import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

class HeadingIcon extends HTMLElement implements Icon {
    private button: Map<string, HTMLElement | null> = new Map<string, HTMLElement | null>();

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);

        for (let i = 0; i <= 5; i++) {
            this.shadowRoot.innerHTML += `
              <button type="button" class="icon ${i === 0 ? "" : "hidden"}" id="button${i}">
                  <svg viewBox="0 3 22 22" xmlns="http://www.w3.org/2000/svg">
                    <path class="icon-svg" d="M7 5C7.55228 5 8 5.44772 8 6V11.5H16V6C16 5.44772 16.4477 5 17 5C17.5523 5 18 5.44772 18 6V12.5V19C18 19.5523 17.5523 20 17 20C16.4477 20 16 19.5523 16 19V13.5H8V19C8 19.5523 7.55228 20 7 20C6.44772 20 6 19.5523 6 19V12.5V6C6 5.44772 6.44772 5 7 5Z"/>      
                  </svg>
                  <sub class="heading-number">${i === 0 ? "" : i}</sub>
              </button>
            `;
        }
        this.shadowRoot.innerHTML = `<div class="flex heading-container">` + this.shadowRoot.innerHTML + `</div>`;

        for (let i = 0; i <= 5; i++) {
            this.button.set("H" + i, this.shadowRoot.getElementById("button" + i));
        }
    }

    setActive(tags: string[]) {
        for (let i = 0; i <= 5; i++) {
            const hTag = "H" + i;
            this.button.get(hTag).className = "icon hidden";
        }

        for (let i = 1; i <= 5; i++) {
            const hTag = "H" + i;
            if (tags.includes(hTag)) {
                this.button.get(hTag).className = "icon active";
                return;
            }
        }

        this.button.get("H0").className = "icon";
    }

    setContentEditable(contentEditable: HTMLElement) {
        for (let i = 1; i <= 5; i++) {
            const hTag = "H" + i;
            this.button.get(hTag).addEventListener("click", () => execCommand({
                    tag: hTag,
                    action: Action.FirstLevel
                }, contentEditable)
            );
        }
    }
}

customElements.define("heading-icon", HeadingIcon);

export default HeadingIcon;