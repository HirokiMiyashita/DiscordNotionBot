import { Client as DiscordClient, GatewayIntentBits } from "discord.js";
import { Client as NotionClient } from "@notionhq/client";


const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
const taskDatabaseId = process.env.TASK_DATABASE_ID;
const userDatabaseId = process.env.USER_DATABASE_ID;

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
            name: "ボンボン",
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
