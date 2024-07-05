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
  if (message.author.bot) return; // BOTのメッセージには反応しない

  if (message.content === "タスクを作成したい") {
    message.channel.send(
      "タスクを作成したいのであれば\nタスク内容: [タスク内容]\nプロジェクト名: [プロジェクト名]\n納期: [納期]\n担当者: [担当者のメンション]\n依頼者: [依頼者のメンション]\n詳細: [詳細]\n上記に順に送ってください\nそれぞれ改行は必須です\n行の先頭に「新規作成」と書いてください"
    );
  }

  if (message.content.startsWith("新規作成")) {
    const lines = message.content.split("\n");

    if (lines.length < 7) {  // 6行から7行に変更
      message.channel.send(
        "入力形式が正しくありません。タスク内容、プロジェクト名、納期、担当者メンション、依頼者メンション、詳細をそれぞれ改行して入力してください。"
      );
      return;
    }

    const dataObject = {
      firstLine: lines[1].replace("【タスク内容】:", "").trim(),
      secondLine: lines[2].replace("【プロジェクト名】:", "").trim(),
      thirdLine: lines[3].replace("【納期】:", "").trim(),
      fourthLine: lines[4].replace("【担当者】:", "").trim(),
      fifthLine: lines[5].replace("【依頼者】:", "").trim(),
      detailLine: lines.slice(6).map(line => line.replace("【詳細】:", "").trim()).join("\n").trim(),  // 新しい詳細行を取得
    };

    console.log("Received data object:", dataObject); // デバッグログ

    try {
      const taskUrl = await main(dataObject);
      message.channel.send(`新規作成に成功しました。下記がタスクのURLです\n${taskUrl}`);
    } catch (error) {
      console.error("Error creating task:", error); // デバッグログ
      message.channel.send("タスクの作成に失敗しました。再度お試しください。");
    }
  }
});

client.on("ready", () => {
  console.log("ボットが起動したよ");
});



client.login(
  "DiscordBotトークン"
);
