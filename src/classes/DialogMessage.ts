import { DialogRole } from "../enums.ts";

export class DialogMessage {

    role: DialogRole;
    content: string;

    constructor(role: DialogRole, content: string) {
        this.role = role;
        this.content = content;
    }

}
