export enum CommandEvent {
    HistoryStart = "be-command-start",
    HistoryEnd = "be-command-end",
    // Announces that the rest of the command is carrier bookkeeping. What it changes is invisible, so
    // anything recorded from here on is not an edit of its own.
    Carrier = "be-command-carrier",
}
