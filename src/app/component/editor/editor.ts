import "@/component/editor/asset/editor.css"
import Toolbar from "@/component/toolbar/toolbar";
import {Settings} from "@/brief-editor";
import {cleanElementWhitespace, pasteParagraph} from "@/core/shared/element-util";
import {History} from "@/core/history/history";
import Table from "@/component/table/table";
import {TableCursor} from "@/core/cursor/table-cursor";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {handleCopyEvent} from "@/core/clipboard/clipboard";

class Editor extends HTMLElement {
    constructor(contentEditable: HTMLElement, settings: Settings) {
        super();

        this.innerHTML = `
          <div class="be-background"></div>
          <div class="be-content-editable">
            <div class="be-content-editable-container">
              <div class="be-content-editable-toolbar" id="be-toolbar"></div>
              <div class="be-content-editable-scroll" id="be-content"></div>
            </div>
          </div>
        `;

        this.initContentEditable(contentEditable, settings?.hasToolbar);
        if (settings?.hasToolbar) {
            new Toolbar(contentEditable, this);
        }
        cleanElementWhitespace(contentEditable);
    }

    private initContentEditable(contentEditable: HTMLElement, hasToolbar?: boolean) {
        contentEditable.after(this);
        contentEditable.className = "be-editor";
        contentEditable.setAttribute("contenteditable", "true");
        document.getElementById("be-content")?.appendChild(contentEditable);
        if (!hasToolbar) {
            document.getElementById("be-toolbar")?.remove();
        }
        pasteParagraph(contentEditable);
        contentEditable.focus();

        // Registered first so that its keydown listener corrects the cursor before the editor acts on it.
        this.addTableCursor(contentEditable);
        this.addKeyboardEvent(contentEditable);
        this.addClickEvent(contentEditable);
        this.addClipboardEvent(contentEditable);
        this.addHistory(contentEditable);
        this.addTable(contentEditable);
    }

    private addHistory(contentEditable: HTMLElement) {
        new History(contentEditable);
    }

    private addTable(contentEditable: HTMLElement) {
        new Table(contentEditable);
    }

    private addTableCursor(contentEditable: HTMLElement) {
        new TableCursor(contentEditable);
    }

    private addKeyboardEvent(contentEditable: HTMLElement) {
        contentEditable.addEventListener("keydown", (event) => execCommand(contentEditable, {action: Action.Keyboard, event}));
    }

    private addClickEvent(contentEditable: HTMLElement) {
        contentEditable.addEventListener("click", () => execCommand(contentEditable, {action: Action.Click}));
    }

    private addClipboardEvent(contentEditable: HTMLElement) {
        contentEditable.addEventListener("paste", (event) => execCommand(contentEditable, {action: Action.Clipboard, event}));
        contentEditable.addEventListener("copy", (event) => handleCopyEvent(event));
        contentEditable.addEventListener("cut", (event) => execCommand(contentEditable, {action: Action.Cut, event}));
    }

    addToolbarItem(toolbar: HTMLElement) {
        document.getElementById("be-toolbar")?.appendChild(toolbar);
    }
}

customElements.define("be-editor-layout", Editor);

export default Editor;