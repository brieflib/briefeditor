import execCommand from "@/command/exec-command";
import {Action} from "@/command/type/command";

document.getElementById("button").addEventListener("click", () => {
    execCommand({tag: "STRONG", action: Action.Unwrap})
})