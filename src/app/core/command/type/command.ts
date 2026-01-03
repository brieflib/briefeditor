export enum Action {
    Tag = "Tag",
    Link = "Link",
    Image = "Image",
    FirstLevel = "FirstLevel",
    PlusIndent = "PlusIndent",
    MinusIndent = "MinusIndent",
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
    tag?: string | string[],
    attributes?: Attributes
}