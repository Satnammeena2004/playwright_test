import axios from "axios";
import dot from "dotenv";
import fs from "fs";

dot.config({ path: ".env" });

const { stats } = JSON.parse(fs.readFileSync("test-results.json", "utf8"));

const total =
  stats?.expected + stats?.unexpected + stats?.skipped + stats?.flaky;

const card = {
  type: "message",
  attachments: [
    {
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "🧪 Playwright Test Results",
            weight: "Bolder",
            size: "Medium",
          },
          {
            type: "FactSet",
            facts: [
              {
                title: "Status",
                value: stats?.unexpected > 0 ? "❌ Failed" : "✅ Passed",
              },
              {
                title: "Passed",
                value: String(stats?.expected),
              },
              {
                title: "Failed",
                value: String(stats?.unexpected),
              },
              {
                title: "Skipped",
                value: String(stats?.skipped),
              },
              {
                title: "Flaky",
                value: String(stats?.flaky),
              },
              {
                title: "Total",
                value: String(total),
              },
              {
                title: "Duration",
                value: `${(stats?.duration / 1000).toFixed(2)} sec`,
              },
            ],
          },
        ],
        actions: [
          {
            type: "Action.OpenUrl",
            title: "View GitHub Actions Run",
            url: "https://github.com/Satnammeena2004/playwright_test/actions/runs/28267471394/job/83757465131",
          },
        ],
      },
    },
  ],
};
export async function sendTeamsNotification() {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("TEAMS_WEBHOOK_URL is not defined.");
  }
  try {
    await axios.post(webhookUrl, card);

    console.log("✅ Teams notification sent successfully.");
  } catch (error) {
    console.error("❌ Failed to send Teams notification:", error);
  }
}

sendTeamsNotification();
