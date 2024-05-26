import { DialogMessage } from "./DialogMessage.ts";
import { DialogRole, GPTModel } from "../enums.ts";

export class SessionData {

    model = GPTModel["GPT 3.5 Turbo"];
    streaming = true;
    dialogMessages = new Array<DialogMessage>();
    dialogMaxSize = 5;
    temperature = 0;
    topP = 0.2;

    static getInitial() {
        return new SessionData();
    }

    static get millisecondsToLive() {
        return 1000 * 60 * 60 * 24 * 365;
    }

    addDialogMessage = (role: DialogRole, content: string) => {
        const dialogMessage = new DialogMessage(role, content);
        const dialogSize = this.dialogMessages.push(dialogMessage);
        if (dialogSize > this.dialogMaxSize)
            this.dialogMessages.shift();
    }

    resetDialogMessages = () => {
        this.dialogMessages = new Array<DialogMessage>();
    }

}
