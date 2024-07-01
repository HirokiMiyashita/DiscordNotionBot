import { Client } from "@notionhq/client";

const auth = "secret_FSG0uhPzTrO000XRMoLjHLgWmzVIF3DVPmGoSvBY0ar"; // あなたのNotion APIキーを設定
const taskDatabaseId = "b8ef6ca8259048eaa447d3c62cfec395"; // タスクを追加するデータベースID
const userDatabaseId = "60b8acc2deec43f8a4891b8e4c8dc46e"; // 担当者とユーザーIDが対応しているデータベースID

const notion = new Client({ auth });

// DiscordメンションからユーザーIDを抽出し、Notionのユーザー名を取得する関数
const getUserNameFromMention = async (mention) => {
  const userId = mention.replace(/[<@!>]/g, "").trim();

  const response = await notion.databases.query({
    database_id: userDatabaseId,
    filter: {
      property: "ユーザーID",
      rich_text: {
        equals: userId,
      },
    },
  });

  if (response.results.length === 0) {
    throw new Error(`User with Discord ID ${userId} not found in Notion database`);
  }

  const userRecord = response.results[0];
  const userNameProperty = userRecord.properties["ユーザー名"];

  if (!userNameProperty || !userNameProperty.people || userNameProperty.people.length === 0) {
    throw new Error(`User name not found for user with Discord ID ${userId}`);
  }

  const userName = userNameProperty.people[0].name;
  return { userName, userId: userNameProperty.people[0].id };
};

// 現在の最大ID番号を取得する関数
const getMaxIdNumber = async () => {
  let maxIdNumber = 0;
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: taskDatabaseId,
      sorts: [
        {
          property: 'ID',
          direction: 'descending'
        }
      ],
      start_cursor: startCursor,
      page_size: 100
    });

    response.results.forEach(page => {
      const idProperty = page.properties.ID;
      if (idProperty && idProperty.rich_text && idProperty.rich_text.length > 0) {
        const idString = idProperty.rich_text[0].text.content;
        const idNumber = parseInt(idString.split('-')[1], 10);
        if (idNumber > maxIdNumber) {
          maxIdNumber = idNumber;
        }
      }
    });

    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return maxIdNumber;
};

// 新しいページを作成する関数
export const main = async (message) => {
  try {
    const maxIdNumber = await getMaxIdNumber();
    const newIdNumber = maxIdNumber + 1;
    const newId = `OBO-${String(newIdNumber).padStart(3, '0')}`;

    const { userName: staffUserName, userId: staffUserId } = await getUserNameFromMention(message.fourthLine);
    const { userName: requesterUserName, userId: requesterUserId } = await getUserNameFromMention(message.fifthLine);

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
          end: null, 
        },
      },
      サーバー: {
        multi_select: [
          {
            name: "オーボ",
          },
        ],
      },
      担当者: {
        people: [
          {
            id: staffUserId,
          },
        ],
      },
      依頼者: {
        people: [
          {
            id: requesterUserId,
          },
        ],
      },
      ID: {
        rich_text: [
          {
            text: {
              content: newId,
            },
          },
        ],
      },
    };

    const detailLines = message.detailLine.split('\n').map(line => line.replace("【詳細】: ", "").trim());
    console.log("Detail lines:", detailLines); // デバッグログ

    const detailBlocks = detailLines.map(line => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: line,
              link: line.match(/^https?:\/\//) ? { url: line } : null
            }
          }
        ]
      }
    }));

    console.log("Detail blocks:", detailBlocks); // デバッグログ

    const response = await notion.pages.create({
      parent: { database_id: taskDatabaseId },
      properties,
      children: detailBlocks,
    });

    console.log("Notion page created:", response); // デバッグログ

    return response.url;
  } catch (error) {
    console.error("Notion APIリクエスト中にエラーが発生しました:", error);
    throw error;
  }
};
