import { Bot, Enhance, InlineKeyboard, MemorySessionStorage, enhanceStorage, session } from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import OpenAI from "https://deno.land/x/openai@v4.47.1/mod.ts";
import { CustomContext, MessageHandler, SessionData } from "./classes/index.ts";
import { DialogRole, GPTModel, KeyboardActions } from "./enums.ts";

const env_prefix = "TCGB_"; // [T]elegram [C]hat[G]PT [B]ot
const apiKey = Deno.env.get(env_prefix + "API_KEY");
const token = Deno.env.get(env_prefix + "TOKEN");
const allowedUsers = Deno.env.get(env_prefix + "ALLOWED_USERS");

if (!apiKey) throw new Error("OpenAI API key is not set.");
if (!token) throw new Error("Telegram bot token is not set.");
if (!allowedUsers) throw new Error("Allowed users list is not set.");

const gptInstructions = [
    "Do short answers unless user asks for details.",
    "In detailed messages use bold to highlight the main idea.",
    "Answer using the language user used in his last message unless he asks for specific language.",
].join(" ");

allowedUsers.split(/[ ,;]/).forEach(user => CustomContext.allowedUsers.add(user));

const bot = new Bot(token, {
    ContextConstructor: CustomContext,
});

const openai = new OpenAI({
    apiKey: apiKey,
});

// Session
bot.use(session({
    initial: SessionData.getInitial,
    storage: enhanceStorage({
        storage: new MemorySessionStorage<Enhance<SessionData>>(),
        millisecondsToLive: SessionData.millisecondsToLive,
    }),
}));

// Access guard
bot.use((ctx, next) => ctx.userAllowed ? next() : ctx.reply("Access not granted"));

// Base commands
await bot.api.setMyCommands([
    { command: "reset", description: "Reset dialog" },
    { command: "model", description: "Select GPT model" },
    { command: "streaming", description: "Toggle streaming mode" },
    { command: "info", description: "Show bot info" },
]);

// Reset dialog context
bot.command("reset", async (ctx) => {
    ctx.session.resetDialogMessages();
    await ctx.reply("Context was reset");
});

// Show available models
bot.command("model", async (ctx) => {
    const keyboard = new InlineKeyboard();
    for (const label in GPTModel)
        keyboard.text(label, `${KeyboardActions.SelectModel} ${label}`).row();
    await ctx.reply("Available models:", {
        reply_markup: keyboard,
    });
});

// Toggle streaming mode
bot.command("streaming", async (ctx) => {
    const keyboard = new InlineKeyboard();
    const text = ctx.session.streaming ? "Disable" : "Enable";
    const data = ctx.session.streaming ? KeyboardActions.DisableStreaming : KeyboardActions.EnableStreaming;
    keyboard.text(text, data).row();
    await ctx.reply(`Streaming currently is ${ctx.session.streaming ? "enabled" : "disabled"}`, {
        reply_markup: keyboard,
    });
});

// Show general info
bot.command("info", async (ctx) => {
    await ctx.reply([
        `Bot: Private ChatGPT bot`,
        `GPT model: ${ctx.session.model}`,
        `Streaming enabled: ${ctx.session.streaming ? "true" : "false"}`,
        `Context size: ${ctx.session.dialogMessages.length} messages (max ${ctx.session.dialogMaxSize})`,
        `Temperature: ${ctx.session.temperature}`,
        `Top P: ${ctx.session.topP}`,
    ].join("\n"));
});

// Handle callback queries (button clicks)
bot.on("callback_query:data", async (ctx) => {

    // Handle model switch
    if (ctx.callbackQuery.data.startsWith(KeyboardActions.SelectModel)) {
        const label = ctx.callbackQuery.data.substring(KeyboardActions.SelectModel.length + 1);
        const model = GPTModel[label as keyof typeof GPTModel];
        if (ctx.session.model === model) {
            await ctx.answerCallbackQuery();
            await ctx.reply(`Already using ${label} (${GPTModel[label as keyof typeof GPTModel]})`);
        } else {
            ctx.session.model = model;
            await ctx.answerCallbackQuery();
            await ctx.reply(`Switched to ${label} (${GPTModel[label as keyof typeof GPTModel]})`);
        }
    }

    // Handle streaming toggle
    else if (ctx.callbackQuery.data === KeyboardActions.EnableStreaming) {
        ctx.session.streaming = true;
        await ctx.answerCallbackQuery();
        await ctx.reply(`Streaming enabled`);
    }
    else if (ctx.callbackQuery.data === KeyboardActions.DisableStreaming) {
        ctx.session.streaming = false;
        await ctx.answerCallbackQuery();
        await ctx.reply(`Streaming disabled`);
    }

});

// Process message using ChatGPT, this is the main function
bot.on("message:text", async (ctx) => {

    const indicator = "⏳";
    const reply = new MessageHandler(ctx, indicator);
    let replyText = "";

    // Save user message to dialog context
    ctx.session.addDialogMessage(DialogRole.User, ctx.message.text);

    if (ctx.session.streaming) {

        // Create chat completion chunk stream if streaming mode
        const chatCompletionChunkStream = await openai.chat.completions.create({
            messages: [
                { role: "system", content: gptInstructions },
                ...ctx.session.dialogMessages,
            ],
            model: ctx.session.model,
            stream: ctx.session.streaming,
            temperature: ctx.session.temperature,
            top_p: ctx.session.topP,
            n: 1,
        });


        // Append completion delta to `text` and try edit response
        for await (const chatCompletionChunk of chatCompletionChunkStream) {
            if (chatCompletionChunk.choices[0]?.delta?.content) {
                replyText += chatCompletionChunk.choices[0]?.delta?.content;
                reply.editText(`${replyText} ${indicator}`);
            }
        }

    } else {

        // Create chat completion if not streaming mode
        const chatCompletion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: gptInstructions },
                ...ctx.session.dialogMessages,
            ],
            model: ctx.session.model,
            stream: ctx.session.streaming,
            temperature: ctx.session.temperature,
            top_p: ctx.session.topP,
            n: 1,
        });

        // Save at once whole completion to `text`
        replyText = chatCompletion.choices[0].message.content ?? "Completion error";

    }

    // Force edit bot response to whole completion
    await reply.editText(replyText, true);

    // Save bot response to dialog context
    ctx.session.addDialogMessage(DialogRole.Bot, replyText);

});

// Report unhandled input
bot.on("message", async (ctx) => {
    await ctx.reply("Invalid input");
});

await bot.start();
