export enum CommandEvent {
    Start = "be-command-start",
    End = "be-command-end",
    // Announces that the rest of the command is carrier bookkeeping. What it changes is invisible, so
    // anything recorded from here on is not an edit of its own.
    Carrier = "be-command-carrier",
}
