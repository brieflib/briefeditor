import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import Tooltip from "@/component/popup/tooltip";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {getSelectedLink, getSelectedSharedTags} from "@/core/selection/selection";
import {addRange, getRange} from "@/core/shared/range-util";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";
import {isNextListNotNested} from "@/core/list/list";

new Tooltip();

class LinkIcon extends HTMLElement implements Icon {
    private contentEditableElement: HTMLElement;
    private readonly button: HTMLElement;
    private readonly tooltip: Tooltip;
    private readonly input: HTMLInputElement;

    private isOpen: boolean;

    constructor() {
        super();
        initShadowRoot(this, toolbarIconCss);
        this.shadowRoot.innerHTML = `
          <button type="button" class="icon" id="button">
            <svg viewBox="0 0 18 18">
              <line class="stroke" x1="7" x2="11" y1="7" y2="11"></line>
              <path class="stroke" d="M8.9,4.577a3.476,3.476,0,0,1,.36,4.679A3.476,3.476,0,0,1,4.577,8.9C3.185,7.5,2.035,6.4,4.217,4.217S7.5,3.185,8.9,4.577Z"></path>
              <path class="stroke" d="M13.423,9.1a3.476,3.476,0,0,0-4.679-.36,3.476,3.476,0,0,0,.36,4.679c1.392,1.392,2.5,2.542,4.679.36S14.815,10.5,13.423,9.1Z"></path>
            </svg>
          </button>
          <be-tooltip>
            <input class="be-link-input"/>
          </be-tooltip>
        `;

        this.button = this.shadowRoot.querySelector("#button");
        this.tooltip = this.shadowRoot.querySelector("be-tooltip");
        this.input = this.shadowRoot.querySelector(".be-link-input");
    }

    setActive(tags: string[]) {
        if (tags.includes("A")) {
            this.button.className = "icon active"
        } else {
            this.button.className = "icon"
        }
    }

    setEnabled(isEnabled: boolean) {
        const range = getRange();
        this.button.setAttribute("disabled", "true");

        if (isEnabled || this.isLinkSelected() || !range.collapsed) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        document.addEventListener("selectionchange", () => {
            const range = getRange().cloneRange();
            const link = getSelectedLink(this.contentEditableElement, range);
            const linkLength = range.endContainer.textContent?.length ?? range.endOffset;
            const href = link[0].getAttribute("href") ?? "";

            if (range.endContainer !== this.tooltip && this.isLinkSelected() && range.collapsed) {
                range.setEnd(range.endContainer, linkLength);
                const rect = range.getBoundingClientRect();
                const left = -rect.width;
                this.openTooltip(href, linkLength, left);
            }
        });

        document.addEventListener("click", (event) => {
            const range = getRange();

            if (this.isLinkSelected() && range.collapsed) {
                return;
            }

            if (event.target === this || event.target === this.input) {
                return;
            }

            this.closeTooltip();
        });

        this.button.addEventListener("click", () => {
            const range = getRange();
            if (range.collapsed) {
                return;
            }

            if (this.isLinkSelected() && !range.collapsed) {
                return;
            }

            const link = getSelectedLink(this.contentEditableElement, range);
            const href = link[0].getAttribute("href") ?? "";
            const rect = range.getBoundingClientRect();
            const left = -rect.width / 2;
            this.openTooltip(href, range.endOffset, left);
        });
    }

    private isLinkSelected() {
        return getSelectedSharedTags(this.contentEditableElement).includes("A");
    }

    private openTooltip(href: string, endOffset: number, left: number) {
        this.input.value = href;
        const leftPx = `${left}px`;
        this.tooltip.open(endOffset, leftPx);
        this.isOpen = true;

        const nextLoopTimeout = 0;
        setTimeout(() => {
            this.setActive(["A"]);
            this.setEnabled(true);
        }, nextLoopTimeout);
    }

    private closeTooltip() {
        this.input.blur();
        this.tooltip.close();
        this.shadowRoot.appendChild(this.tooltip);
        this.isOpen = false;
    }
}

customElements.define("link-icon", LinkIcon);

export default LinkIcon;