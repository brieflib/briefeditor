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
import PlusIndentIcon from "@/component/toolbar-icon/plus-indent";
import MinusIndentIcon from "@/component/toolbar-icon/minus-indent";
import LinkIcon from "@/component/toolbar-icon/link-icon";
import ImageIcon from "@/component/toolbar-icon/image-icon";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import TableIcon from "@/component/toolbar-icon/table-icon";
import UndoIcon from "@/component/toolbar-icon/undo-icon";
import RedoIcon from "@/component/toolbar-icon/redo-icon";
import {History} from "@/core/history/history";
import SuperscriptIcon from "@/component/toolbar-icon/superscript-icon";
import SubscriptIcon from "@/component/toolbar-icon/subscript-icon";

export default class Toolbar {
    private readonly contentEditable: HTMLElement;
    private readonly history: History;
    private editorLayout: Editor;
    private items: Icon[] = [];

    constructor(contentEditable: HTMLElement, editor: Editor, history: History) {
        this.contentEditable = contentEditable;
        this.editorLayout = editor;
        this.history = history;

        this.addToolbarIcons();

        document.addEventListener("selectionchange", () => {
            const cursorPosition = getCursorPosition();
            const sharedTags = getSelectedSharedTags(this.contentEditable, cursorPosition);
            for (const item of this.items) {
                if (item.setActive) {
                    item.setActive(sharedTags);
                }
                if (item.setEnabled) {
                    item.setEnabled(this.contentEditable, cursorPosition, sharedTags);
                }
            }
        });
    }

    private addToolbarIcons() {
        this.addIcon(new UndoIcon());
        this.addIcon(new RedoIcon());
        this.addEmptyItem();
        this.addIcon(new BoldIcon());
        this.addIcon(new ItalicIcon());
        this.addIcon(new UnderlineIcon());
        this.addEmptyItem();
        this.addIcon(new SuperscriptIcon());
        this.addIcon(new SubscriptIcon());
        this.addEmptyItem();
        this.addIcon(new HeadingIcon());
        this.addIcon(new BlockquoteIcon());
        this.addEmptyItem();
        this.addIcon(new UnorderedListIcon());
        this.addIcon(new OrderedListIcon());
        this.addIcon(new MinusIndentIcon());
        this.addIcon(new PlusIndentIcon());
        this.addEmptyItem();
        this.addIcon(new LinkIcon());
        this.addIcon(new ImageIcon());
        this.addEmptyItem();
        this.addIcon(new TableIcon());
    }

    private addIcon(icon: Icon) {
        icon.setContentEditable(this.contentEditable);
        if (icon.setHistory) {
            icon.setHistory(this.history);
        }
        this.items.push(icon);
        this.editorLayout.addToolbarItem(icon);
    }

    private addEmptyItem() {
        const item = new EmptyIcon();
        this.editorLayout.addToolbarItem(item);
    }
}