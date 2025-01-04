# Lightweight and simple client library for yoai bots 

## Initilaisation
```javascript
import {Bot} from "yoai-bots"

const myBot = new Bot("bot access token")
```
## Code Functionality 
This code snippet is a simple bot built using the YoAI bots library. It handles basic commands and interactions with users. Below is a breakdown of its functionality:
1. Message Event Listener
```javascript
myBot.on("message", async(ctx) => {
ctx.reply("Some message")
})
```
- Purpose: Listens to all incoming messages that are not commands.
- Response: Replies to the user with "Some message" regardless of the content of their message.
2. Start Command
```javascript
myBot.command("start", async(ctx) => {
    ctx.reply("Start command")
})
```
- Purpose: Handles the /start command sent by the user.
- Response: Replies to the user with the message "Start command".

3. Photo Command
```javascript
myBot.command("photo", async(ctx) => {
    ctx.replyWithPhoto("photo.jpg")
})
```
- Purpose: Handles the /photo command sent by the user.
- Response: Sends the user an image file named "photo.jpg".

4. Bot Initialization
```javascript
myBot.start()
```
- Purpose: Starts the bot and connects it to YoAI's servers. The bot begins to listen for messages and commands.
- Mechanism
  - By default, the `start()` method uses long polling to retrieve updates from YoAI.
  - Long Polling: The bot sends an HTTP request to YoAI's servers and keeps the connection open until a new update is available or the timeout is reached. When an update is received, the bot processes it and immediately sends another request, creating a continuous loop of update fetching.
