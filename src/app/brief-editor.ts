import "/asset/global.css";
import Editor from "@/component/editor/editor";
import Toolbar from "@/component/toolbar/toolbar";
import {Display, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";

export interface Settings {
    hasToolbar?: boolean
}

export default class BriefEditor {
    private readonly contentEditableElement: HTMLElement;

    constructor(settings: Settings = {
        hasToolbar: true
    }) {
        const contentEditable = document.querySelector("#be-editor");
        if (!contentEditable) {
            throw new Error("There is no #be-editor");
        }
        const contentEditableHTML = contentEditable as HTMLElement;
        const editor = new Editor(contentEditableHTML, settings?.hasToolbar);
        if (settings?.hasToolbar) {
            new Toolbar(contentEditableHTML, editor);
        }

        this.contentEditableElement = contentEditableHTML;
        this.cleanElementWhitespace(contentEditableHTML);
    }

    public toggleTag(tagName: string, attributes?: {}) {
        const upperCaseTagName = tagName.toUpperCase();
        const action = this.getAction(upperCaseTagName);
        execCommand(this.contentEditableElement, {
            action: action,
            tag: upperCaseTagName,
            attributes: attributes
        });
    }

    public changeAttribute(tagName: string, attributes?: {}) {
        const upperCaseTagName = tagName.toUpperCase();
        execCommand(this.contentEditableElement, {
            action: Action.Attribute,
            tag: upperCaseTagName,
            attributes: attributes
        });
    }

    public plusIndent() {
        execCommand(this.contentEditableElement, {
            action: Action.PlusIndent
        })
    }

    public minusIndent() {
        execCommand(this.contentEditableElement, {
            action: Action.MinusIndent
        })
    }

    private getAction(tagName: string): Action {
        if (isSchemaContainNodeName(tagName, [Display.ListWrapper])) {
            return Action.List;
        }

        if (isSchemaContainNodeName(tagName, [Display.FirstLevel])) {
            return Action.FirstLevel;
        }

        if (isSchemaContainNodeName(tagName, [Display.Image])) {
            return Action.Image;
        }

        if (isSchemaContainNodeName(tagName, [Display.Link])) {
            return Action.Link;
        }

        return Action.Tag;
    }

    private cleanElementWhitespace(element: HTMLElement) {
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE &&
                node.textContent?.trim() === '') {
                node.remove();
            }
        });

        element.querySelectorAll("*").forEach(child => {
            this.cleanElementWhitespace(child as HTMLElement);
        });
    }
}