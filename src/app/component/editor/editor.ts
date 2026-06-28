import "@/component/editor/asset/editor.css"
import Toolbar from "@/component/toolbar/toolbar";
import {Settings} from "@/brief-editor";
import {handleKeyboardEvent} from "@/core/keyboard/keyboard";
import {cleanElementWhitespace, pasteParagraph} from "@/core/shared/element-util";
import {handleClipboardEvent} from "@/core/clipboard/clipboard";
import {History} from "@/core/history/history";

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

        this.addKeyboardEvent(contentEditable);
        this.addClipboardEvent(contentEditable);
        this.addHistory(contentEditable);
    }

    private addHistory(contentEditable: HTMLElement) {
        new History(contentEditable);
    }

    private addKeyboardEvent(contentEditable: HTMLElement) {
        contentEditable.addEventListener("keydown", (event) => handleKeyboardEvent(contentEditable, event));
    }

    private addClipboardEvent(contentEditable: HTMLElement) {
        contentEditable.addEventListener("paste", (event) => handleClipboardEvent(contentEditable, event));
    }

    addToolbarItem(toolbar: HTMLElement) {
        document.getElementById("be-toolbar")?.appendChild(toolbar);
    }
}

customElements.define("be-editor-layout", Editor);

export default Editor;