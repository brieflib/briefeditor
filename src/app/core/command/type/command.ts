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
}

export interface Attributes {
    image?: Blob;
    href?: string | null;
    class?: string | null
}

export interface Command {
    action: Action,
    tag?: string,
    attributes?: Attributes | undefined
}