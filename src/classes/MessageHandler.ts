import { Message } from "https://deno.land/x/grammy@v1.23.0/types.ts";
import { PromiseExt } from "jsr:@0x2e757/promise-ext";
import { escapeUnsafeChars, parseMarkdownToMarkdownV2 } from "../helpers.ts";
import { CustomContext } from "./CustomContext.ts";

export class MessageHandler {

    ctx: CustomContext;
    commited: boolean;
    promise: Promise<unknown>;
    chatId?: number;
    messageId?: number;
    textSent?: string;

    get #options() {
        return { parse_mode: "MarkdownV2" as const };
    }

    constructor(ctx: CustomContext, text: string) {
        this.ctx = ctx;
        this.commited = false;
        this.promise = ctx
            .reply(escapeUnsafeChars(text), this.#options)
            .then(value => PromiseExt.timeout(250, value) as any)
            .then(this.#replyCallback);
    }

    #replyCallback = (message: Message.TextMessage) => {
        this.chatId = message.chat.id;
        this.messageId = message.message_id;
        this.textSent = message.text;
        this.commited = true;
    }

    #editCallback = (text: string) => () => {
        this.textSent = text;
        this.commited = true;
    }

    editText = (text: string, guaranteed: boolean = false): Promise<unknown> => {
        if (guaranteed && !this.commited)
            return this.promise.then(() => this.editText(text));
        if (this.commited && text !== this.textSent) {
            this.commited = false;
            this.promise = this.ctx.api
                .editMessageText(this.chatId!, this.messageId!, parseMarkdownToMarkdownV2(text), this.#options)
                .catch(console.error)
                .then((value) => PromiseExt.timeout(250, value) as any)
                .then(this.#editCallback(text))
        }
        return this.promise;
    }

}
