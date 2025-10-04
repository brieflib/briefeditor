export enum Action {
    Tag = "Tag",
    FirstLevel = "FirstLevel"
}

export interface Command {
    tag: string,
    action: Action
}