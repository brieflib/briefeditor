export enum Action {
    Tag = "Tag",
    FirstLevel = "FirstLevel",
    PlusIndent = "PlusIndent",
    MinusIndent = "MinusIndent",
}

export interface Command {
    action: Action,
    tag?: string | string[]
}