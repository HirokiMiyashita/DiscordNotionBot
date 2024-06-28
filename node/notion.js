import { Client } from "@notionhq/client";




// Initializing a client
export const main = async (message) => {
  const notion = new Client({ auth });

  // ページに追加するデータ
  const properties = {
    タスク内容: {
      title: [
        {
          text: {
            content: message.firstLine,
          },
        },
      ],
    },
    プロジェクト名: {
      multi_select: [
        {
          name: message.secondLine,
        },
      ],
    },
    納期: {
      date: {
        start: new Date(message.thirdLine).toISOString(),
        end: null, // 終了日がない場合はnull
      },
    },
    // 他のプロパティも必要に応じて設定
  };

  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
    console.log("新しいページが作成されました:", response);

    return response.url;
  } catch (error) {
    console.error("Notion APIリクエスト中にエラーが発生しました:", error);
    throw error; // エラーを投げ直して呼び出し元でキャッチできるようにする
  }
};
