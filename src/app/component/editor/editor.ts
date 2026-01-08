import "@/component/editor/asset/editor.css"
import Toolbar from "@/component/toolbar/toolbar";
import {Settings} from "@/brief-editor";
import {handleEvent} from "@/core/keyboard/keyboard";
import {cleanElementWhitespace, pasteParagraph} from "@/core/shared/element-util";

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
    }

    private addKeyboardEvent(contentEditable: HTMLElement) {
        contentEditable.addEventListener("keydown", (event) => handleEvent(contentEditable, event));
    }

    addToolbarItem(toolbar: HTMLElement) {
        document.getElementById("be-toolbar")?.appendChild(toolbar);
    }
}

customElements.define("be-editor-layout", Editor);

export default Editor;