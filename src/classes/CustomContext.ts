import { Api, Context, SessionFlavor } from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import { Update, UserFromGetMe } from "https://deno.land/x/grammy_types@v3.7.0/mod.ts";
import { SessionData } from "./SessionData.ts";

export class CustomContext extends Context implements SessionFlavor<SessionData> {

    static readonly allowedUsers = new Set<string>;

    readonly session!: SessionData;
    readonly userAllowed: boolean;

    constructor(update: Update, api: Api, me: UserFromGetMe) {
        super(update, api, me);
        const username = this.#getUsername(update) ?? "";
        this.userAllowed = CustomContext.allowedUsers.has(username);
    }

    #getUsername = (update: Update) => {
        if (update.message)
            return update.message.from.username;
        if (update.callback_query)
            return update.callback_query.from.username;
    }

}
