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
    InsertRow = "InsertRow",
    InsertColumn = "InsertColumn",
    DeleteRow = "DeleteRow",
    DeleteColumn = "DeleteColumn",
}

export interface Attributes {
    image?: Blob;
    href?: string | null;
    class?: string | null
}

export interface TableTarget {
    cell: HTMLTableCellElement;
    after?: boolean;
}

export interface Command {
    action: Action,
    tag?: string,
    attributes?: Attributes | undefined,
    event?: KeyboardEvent | ClipboardEvent | MouseEvent,
    table?: TableTarget
}