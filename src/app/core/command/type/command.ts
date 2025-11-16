export enum Action {
    Tag = "Tag",
    FirstLevel = "FirstLevel",
    PlusIndent = "PlusIndent",
    MinusIndent = "MinusIndent",
    Wrap = "Wrap",
    Unwrap = "Unwrap",
}

export interface Command {
    action: Action,
    tag?: string | string[]
}