export enum Action {
    Tag = "Tag",
    FirstLevel = "FirstLevel"
}

export interface Command {
    tag: string | string[],
    action: Action
}