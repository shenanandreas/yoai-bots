import axios, {AxiosInstance, CreateAxiosDefaults} from "axios";
import fs from "fs";
import FormData from "form-data";

/**
 * Represents the context of a message or update.
 */
export class Context {
    update: any;
    content: string;
    sender: { id: string };
    yoaiClient: YoAIClient;

    constructor(update: any, content: string, sender: { id: string }, yoaiClient: YoAIClient) {
        this.update = update;
        this.content = content || "";
        this.sender = sender;
        this.yoaiClient = yoaiClient;
    }

    async reply(text: string): Promise<void> {
        return this.yoaiClient.sendMessage(this.sender.id, text);
    }

    replyWithPhoto(photo: string): Promise<void> {
        return this.yoaiClient.sendPhoto(this.sender.id, "photo", photo);
    }
}

export class YoAIClient {
    client: AxiosInstance;

    constructor(token: string) {
        this.client = axios.create({
            baseURL: "https://yoai.yophone.com/api/pub",
            headers: {
                post: {
                    "X-YoAI-API-Key": token,
                },
            },
        } as CreateAxiosDefaults);
    }

    async sendMessage(to: string, text: string): Promise<void> {
        await this.client.post("/sendMessage", { to, text });
    }

    async sendPhoto(to: string, text: string, photo: string): Promise<void> {
        if(!fs.existsSync(photo)){
            throw "file not found at path " + photo
        }
        const fileBuffer = fs.readFileSync(photo);
        const formdata = new FormData();
        formdata.append("to", to);
        formdata.append("text", text);
        console.log(fileBuffer)
        formdata.append("file", fs.createReadStream(photo), photo);

        await this.client.post("/sendMessage", formdata, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    }

    getUpdates(): Promise<any> {
        return this.client.post("/getUpdates");
    }
}

export class Bot {
    middlewares: Array<(ctx: Context, next: () => Promise<void>) => Promise<void>>;
    yoaiClient: YoAIClient;

    constructor(token: string) {
        this.middlewares = [];
        this.yoaiClient = new YoAIClient(token);
    }

    command(command: string, handler: (ctx: Context) => Promise<void>): void {
        this.middlewares.push(async (ctx, next) => {
            if (ctx.content.startsWith("/")) {
                const commandName = ctx.content.substring(1).trim();
                if (command === commandName) {
                    await handler(ctx);
                    await next();
                } else {
                    await next();
                }
            } else {
                await next();
            }
        });
    }

    on(event: string, handler: (ctx: Context) => Promise<void>): void {
        this.middlewares.push(async (ctx, next) => {
            if (ctx.content && !ctx.content.startsWith("/")) {
                await handler(ctx);
                await next();
            }
            await next();
        });
    }

    start(): void {
        this._getUpdates();
    }

    setWebhook(): void {
        // Not implemented yet
    }

    use(handler: (ctx: Context, next: () => Promise<void>) => Promise<void>): void {
        this.middlewares.push(handler);
    }

    private async runMiddlewares(ctx: Context): Promise<void> {
        const next = async (index: number) => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index];
                await middleware(ctx, () => next(index + 1));
            }
        };
        await next(0);
    }

    private async handleMessage(update: any): Promise<void> {
        const { text, sender } = update;
        let messageTextReceived = Buffer.from(text, "base64").toString("utf-8");

        try {
            const decodedData = JSON.parse(messageTextReceived);
            messageTextReceived = decodedData.content.content;
        } catch (e) {
            console.log("Received plain text", messageTextReceived);
        }

        const ctx = new Context(update, messageTextReceived, sender, this.yoaiClient);
        await this.runMiddlewares(ctx);
    }

    private async _getUpdates(): Promise<void> {
        try {
            const data = await this.yoaiClient.getUpdates();
            console.log("Status code", data.status);

            if (data.status === 200) {
                data.data.data.forEach((m: any) => {
                    this.handleMessage(m);
                });
            }

            if (data.status === 200 || data.status === 204) {
                return this._getUpdates();
            } else if (data.status >= 500) {
                await wait(5000);
            } else if (data.status === 429) {
                console.error("Rate limit reached");
            } else {
                console.error("Service unavailable");
            }
        } catch (e: any) {
            if (e.code === "ECONNRESET" || e.code === "ERR_BAD_RESPONSE") {
                return this._getUpdates();
            } else {
                await wait(5000);
                return this._getUpdates();
            }
        }
    }
}

async function wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

export default Bot;
