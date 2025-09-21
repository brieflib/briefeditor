export enum Action {
    Tag = "Tag"
}

export interface Command {
    tag: string,
    action: Action
}