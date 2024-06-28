import { Client as DiscordClient, GatewayIntentBits } from "discord.js";
import { main } from "./notion.js";

const client = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; //BOTのメッセージには反応しない
  console.log(message);

  if (message.content === "タスクを作成したい") {
    message.channel.send(
      "タスクを作成したいのであれば\nタスク内容\nプロジェクト名\n納期\n上記に順に送ってください\nそれぞれ改行は必須です\n行の先頭に「新規作成」と書いてください"
    );
  }
  if (message.content.startsWith("新規作成")) {
    const lines = message.content.split("\n");

    if (lines.length < 4) {
      message.channel.send(
        "入力形式が正しくありません。タスク内容、プロジェクト名、納期をそれぞれ改行して入力してください。"
      );
      return;
    }

    const dataObject = {
      firstLine: lines[1] || "", // デフォルト値を設定
      secondLine: lines[2] || "", // デフォルト値を設定
      thirdLine: lines[3] || "", // デフォルト値を設定
    };

    try {
      const taskUrl = await main(dataObject);
      message.channel.send(
        "新規作成に成功しました。下記がタスクのURLです\n" + taskUrl
      );
    } catch (error) {
      console.error("タスク作成中にエラーが発生しました:", error);
      message.channel.send("タスクの作成に失敗しました。再度お試しください。");
    }
  }
});

client.on("ready", () => {
  console.log("ボットが起動したよ");
});

