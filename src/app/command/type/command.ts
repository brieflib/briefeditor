export enum Action {
    Wrap = "Wrap",
    Unwrap = "Unwrap"
}

export interface Command {
    tag: string,
    action: Action
}