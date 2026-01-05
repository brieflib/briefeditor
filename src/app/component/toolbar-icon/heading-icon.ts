// @ts-ignore
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

class HeadingIcon extends HTMLElement implements Icon {
    private button: Map<string, HTMLElement | null> = new Map<string, HTMLElement | null>();
    private readonly container: HTMLElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, toolbarIconCss);

        for (let i = 0; i <= 5; i++) {
            shadowRoot.innerHTML += `
              <button type="button" class="icon ${i === 0 ? "" : "hidden"}" id="button${i}">
                  <svg viewBox="0 3 22 22" xmlns="http://www.w3.org/2000/svg">
                    <path class="icon-svg" d="M7 5C7.55228 5 8 5.44772 8 6V11.5H16V6C16 5.44772 16.4477 5 17 5C17.5523 5 18 5.44772 18 6V12.5V19C18 19.5523 17.5523 20 17 20C16.4477 20 16 19.5523 16 19V13.5H8V19C8 19.5523 7.55228 20 7 20C6.44772 20 6 19.5523 6 19V12.5V6C6 5.44772 6.44772 5 7 5Z"/>      
                  </svg>
                  <sub class="heading-number">${i === 0 ? "" : i}</sub>
              </button>
            `;
        }
        shadowRoot.innerHTML = `<div class="flex" id="heading-container">` + shadowRoot.innerHTML + `</div>`;
        this.container = shadowRoot.getElementById("heading-container") as HTMLElement;

        for (let i = 0; i <= 5; i++) {
            const hTag = "H" + i;
            this.button.set("H" + i, shadowRoot.getElementById("button" + i));
            this.getButtonSafe(hTag).addEventListener("click", () => {
                const isShow = this.isShowIcon();
                this.showIcons(isShow);
            });
        }

        this.getButtonSafe("H0").setAttribute("disabled", "true");
    }

    setActive(tags: string[]) {
        this.showIcons(false);

        for (let i = 0; i <= 5; i++) {
            const hTag = "H" + i;
            this.getButtonSafe(hTag).className = "icon hidden";
        }

        for (let i = 1; i <= 5; i++) {
            const hTag = "H" + i;
            if (tags.includes(hTag)) {
                this.getButtonSafe(hTag).className = "icon active";
                return;
            }
        }

        this.getButtonSafe("H0").className = "icon";
    }

    setEnabled(isEnabled: boolean) {
        this.getButtonSafe("H0").setAttribute("disabled", "true");

        if (isEnabled) {
            this.getButtonSafe("H0").removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        for (let i = 1; i <= 5; i++) {
            const hTag = "H" + i;
            this.getButtonSafe(hTag).addEventListener("click", () => {
                if (!this.isShowIcon()) {
                    return;
                }

                execCommand(contentEditable, {
                    action: Action.FirstLevel,
                    tag: hTag
                })
            });
        }
    }

    private showIcons(isShow?: boolean) {
        if (isShow) {
            this.container.className = "flex show-icons";
            return;
        }

        this.container.className = "flex";
    }

    private isShowIcon(): boolean {
        return !this.container.classList.contains("show-icons");
    }

    private getButtonSafe(hTag: string): HTMLElement {
        const button = this.button.get(hTag);
        if (!button) {
            throw new Error(`Button ${hTag} not found`);
        }
        return button;
    }
}

customElements.define("heading-icon", HeadingIcon);

export default HeadingIcon;