import toolbarIconCss from "@/component/toolbar-icon/asset/toolbar-icon.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {Icon} from "@/component/toolbar-icon/type/icon";
import Tooltip from "@/component/popup/tooltip";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {getSelectedLink, getSelectedSharedTags} from "@/core/selection/selection";
import {getRange} from "@/core/shared/range-util";
import {CursorPosition, isCursorPositionEqual} from "@/core/cursor/type/cursor-position";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";

new Tooltip();

class LinkIcon extends HTMLElement implements Icon {
    private contentEditableElement: HTMLElement;
    private readonly button: HTMLElement;
    private readonly tooltip: Tooltip;
    private readonly input: HTMLInputElement;

    private isOpen: boolean;
    private isSaved: boolean;
    private isInputFocused: boolean;
    private cursorPosition: CursorPosition | null;

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
            <input class="be-link-input" placeholder="Write url here"/>
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
        this.button.setAttribute("disabled", "true");

        if (isEnabled) {
            this.button.removeAttribute("disabled");
        }
    }

    setContentEditable(contentEditable: HTMLElement) {
        this.contentEditableElement = contentEditable;

        document.addEventListener("selectionchange", (event) => {
            let range = getRange().cloneRange();
            if (range.endContainer === this.tooltip || event.target === this.input) {
                return;
            }

            if (!this.isSaved) {
                this.link(this.input.value);
                this.isSaved = true;
            }

            const cursorPosition = getSelectionOffset(this.contentEditableElement);
            if (!isCursorPositionEqual(cursorPosition, this.cursorPosition) && !this.isInputFocused) {
                this.cursorPosition = cursorPosition;
                this.closeTooltip();
            }
            range = getRange().cloneRange();
            const link = getSelectedLink(this.contentEditableElement, range)[0];
            const linkLength = range.endContainer.textContent?.length ?? range.endOffset;
            const href = link?.getAttribute("href") ?? "";

            if (this.isLinkSelected() && range.collapsed) {
                range.setEnd(range.endContainer, linkLength);
                const rect = range.getBoundingClientRect();
                const left = -rect.width;
                this.openTooltip(href, linkLength, left);
            }
        });

        this.button.addEventListener("click", () => {
            const range = getRange();
            if (range.collapsed) {
                return;
            }

            if (this.isLinkSelected() && !range.collapsed) {
                this.sendLinkCommand(null);
                return;
            }

            const link = getSelectedLink(this.contentEditableElement, range)[0];
            const href = link?.getAttribute("href") ?? "";
            const rect = range.getBoundingClientRect();
            const left = -rect.width / 2;
            this.openTooltip(href, range.endOffset, left);
            this.input.focus();
        });

        this.input.addEventListener("change", () => {
            this.isSaved = false;
        });

        this.input.addEventListener("focus", () => {
            this.isInputFocused = true;
        });

        this.input.addEventListener("blur", () => {
            this.isInputFocused = false;
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
    }

    private closeTooltip() {
        this.input.blur();
        this.tooltip.close();
        this.shadowRoot.appendChild(this.tooltip);
        this.isOpen = false;
    }

    private link(href: string | null) {
        const clickCursorPosition = getSelectionOffset(this.contentEditableElement);

        if (this.cursorPosition) {
            setCursorPosition(this.contentEditableElement, this.cursorPosition);
            this.sendLinkCommand(href);
        }

        if (clickCursorPosition) {
            setCursorPosition(this.contentEditableElement, clickCursorPosition);
        }
    }

    private sendLinkCommand(href: string | null) {
        execCommand(this.contentEditableElement, {
            action: Action.Link, tag: ["A"], attributes: new Map<string, string | null>([
                ["href", href]
            ])
        });
    }
}

customElements.define("link-icon", LinkIcon);

export default LinkIcon;