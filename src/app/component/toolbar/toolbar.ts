import Editor from "@/component/editor/editor";
import BoldIcon from "@/component/toolbar-icon/bold-icon";
import {getSelectedSharedTags} from "@/core/selection/selection";
import ItalicIcon from "@/component/toolbar-icon/italic-icon";
import UnderlineIcon from "@/component/toolbar-icon/underline-icon";
import HeadingIcon from "@/component/toolbar-icon/heading-icon";
import EmptyIcon from "@/component/toolbar-icon/empty-icon";
import {Icon} from "@/component/toolbar-icon/type/icon";
import BlockquoteIcon from "@/component/toolbar-icon/blockquote-icon";
import UnorderedListIcon from "@/component/toolbar-icon/unordered-list-icon";
import OrderedListIcon from "@/component/toolbar-icon/ordered-list-icon";

export default class Toolbar {
    private readonly contentEditable: HTMLElement;
    private editorLayout: Editor;
    private items: Icon[] = [];

    constructor(contentEditable: HTMLElement, editor: Editor) {
        this.contentEditable = contentEditable;
        this.editorLayout = editor;

        this.addToolbarIcons();

        document.addEventListener("selectionchange", () => {
            const sharedTags = getSelectedSharedTags(contentEditable);
            for (const item of this.items) {
                item.setActive(sharedTags);
            }
        });
    }

    private addToolbarIcons() {
        this.addIcon(new BoldIcon());
        this.addIcon(new ItalicIcon());
        this.addIcon(new UnderlineIcon());
        this.addEmptyItem();
        this.addIcon(new HeadingIcon());
        this.addIcon(new BlockquoteIcon());
        this.addEmptyItem();
        this.addIcon(new UnorderedListIcon());
        this.addIcon(new OrderedListIcon());
    }

    private addIcon(icon: Icon) {
        icon.setContentEditable(this.contentEditable);
        this.items.push(icon);
        this.editorLayout.addToolbarItem(icon);
    }

    private addEmptyItem() {
        const item = new EmptyIcon();
        this.editorLayout.addToolbarItem(item);
    }
}