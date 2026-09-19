export enum Action {
    Tag = "Tag",
    Link = "Link",
    Image = "Image",
    FirstLevel = "FirstLevel",
    List = "List",
    PlusIndent = "PlusIndent",
    MinusIndent = "MinusIndent",
    Attribute = "Attribute",
    Wrap = "Wrap",
    Unwrap = "Unwrap",
    Keyboard = "Keyboard",
    Click = "Click",
    Clipboard = "Clipboard",
    Cut = "Cut",
    InsertTable = "InsertTable",
    InsertRow = "InsertRow",
    InsertColumn = "InsertColumn",
    DeleteRow = "DeleteRow",
    DeleteColumn = "DeleteColumn",
    DeleteImage = "DeleteImage",
    ModifyClass = "ModifyClass",
}

export interface Attributes {
    image?: Blob;
    href?: string | null;
    class?: string | null;
    alt?: string | null;
}

export interface TableTarget {
    cell: HTMLTableCellElement;
    after?: boolean;
}

export interface TableSize {
    rows: number;
    columns: number;
}

/** Class changes applied in this order: removed, added, then toggled. */
export interface ClassChange {
    add?: string[];
    remove?: string[];
    toggle?: string[];
}

export interface Command {
    action: Action,
    tag?: string,
    attributes?: Attributes | undefined,
    event?: KeyboardEvent | ClipboardEvent | MouseEvent,
    table?: TableTarget,
    size?: TableSize,
    image?: HTMLImageElement,
    element?: HTMLElement,
    classes?: ClassChange
}