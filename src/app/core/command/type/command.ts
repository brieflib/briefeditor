export enum Action {
    Tag = "Tag",
    Link = "Link",
    FirstLevel = "FirstLevel",
    PlusIndent = "PlusIndent",
    MinusIndent = "MinusIndent",
    Wrap = "Wrap",
    Unwrap = "Unwrap",
}

export interface Command {
    action: Action,
    tag?: string | string[],
    attributes?: Map<string, string>
}