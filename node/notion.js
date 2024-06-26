import { Client } from "@notionhq/client";

// 自身の利用するデータベースID

// アクセストークン

// Initializing a client
export const main = async (message) => {
  const notion = new Client({ auth });

  // ページに追加するデータ
  const properties = {
    名前: {
      title: [
        {
          text: {
            content: message.firstLine,
          },
        },
      ],
    },
    タグ: {
      multi_select: [
        // タグは multi_select タイプ
        {
          name: message.secondLine,
        },
      ],
    },
    テキスト: {
      rich_text: [
        // テキストは rich_text タイプ
        {
          text: {
            content: message.thirdLine,
          },
        },
      ],
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
