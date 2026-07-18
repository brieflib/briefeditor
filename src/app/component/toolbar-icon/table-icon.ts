// @ts-expect-error inline is not supported by lint
import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import {Icon} from "@/component/toolbar-icon/type/icon";
import initShadowRoot from "@/component/shared/shadow-root";
import {isRangeIn} from "@/core/shared/type/cursor-position";
import TableDropdown from "@/component/popup/table-dropdown";

class TableIcon extends HTMLElement implements Icon {
    private contentEditableElement?: HTMLElement;
    private readonly button: HTMLElement;
    private readonly tableDropdown: TableDropdown;
    private isActive?: boolean;

    constructor() {
        super();

        new TableDropdown();

        const shadowRoot = initShadowRoot(this, toolbarIconCss);
        shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button" disabled>
            <svg viewBox="0 0 18 18">
                <path class="icon-svg" d="M3.75,3H14.25A1.5,1.5 0 0,1 15.75,4.5V13.5A1.5,1.5 0 0,1 14.25,15H3.75A1.5,1.5 0 0,1 2.25,13.5V4.5A1.5,1.5 0 0,1 3.75,3M3.75,6V9H8.25V6H3.75M9.75,6V9H14.25V6H9.75M3.75,10.5V13.5H8.25V10.5H3.75M9.75,10.5V13.5H14.25V10.5H9.75Z" />
            </svg>
          </button>
          <be-table-dropdown></be-table-dropdown>
        `;

        this.button = shadowRoot.getElementById("button") as HTMLElement;
        this.tableDropdown = shadowRoot.querySelector("be-table-dropdown") as TableDropdown;
    }

    setActive(tags: string[]) {
        this.isActive = tags.includes("TABLE");

        if (this.isActive) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setEnabled(isEnabled: boolean) {
        this.button.setAttribute("disabled", "true");

        if (!isRangeIn(this.contentEditableElement)) {
            return;
        }

        if (isEnabled || !this.isActive) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        this.button.addEventListener("click", () => {
            this.tableDropdown.open(this.button);
        });
    }
}

customElements.define("be-table-icon", TableIcon);

export default TableIcon;