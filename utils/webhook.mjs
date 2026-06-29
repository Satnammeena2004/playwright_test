import axios from "axios";
import dot from "dotenv";
import fs from "fs";
import {
  cfg,
  configFile,
  failed,
  failedTests,
  flaky,
  formatDuration,
  passed,
  passRate,
  projects,
  runDate,
  skipped,
  stats,
} from "../generateReport.mjs";
import path from "path";
dot.config({ path: ".env" });

const total =
  stats?.expected + stats?.unexpected + stats?.skipped + stats?.flaky;

const card = {
  type: "message",
  attachments: [
    {
      contentType: "application/vnd.microsoft.card.adaptive",
      contentUrl: null,
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.2",
        msteams: { width: "Full" },
        body: [
          // ── HEADER ROW ──────────────────────────────────────────
          {
            type: "ColumnSet",
            columns: [
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: "🧪 Playwright Test Report",
                    weight: "Bolder",
                    size: "Large",
                    wrap: true,
                  },
                  {
                    type: "TextBlock",
                    text: `🕐 ${runDate}`,
                    isSubtle: true,
                    size: "Small",
                    spacing: "None",
                    wrap: true,
                  },
                ],
              },
              {
                type: "Column",
                width: "auto",
                verticalContentAlignment: "Center",
                items: [
                  {
                    type: "TextBlock",
                    text: failed > 0 ? "❌ FAILED" : "✅ PASSED",
                    weight: "Bolder",
                    size: "Medium",
                    color: failed > 0 ? "Attention" : "Good",
                    horizontalAlignment: "Right",
                  },
                ],
              },
            ],
          },

          // ── BIG NUMBERS ROW ─────────────────────────────────────
          {
            type: "ColumnSet",
            spacing: "Medium",
            separator: true,
            columns: [
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: String(passed),
                    weight: "Bolder",
                    size: "ExtraLarge",
                    color: "Good",
                    horizontalAlignment: "Center",
                  },
                  {
                    type: "TextBlock",
                    text: "✅ Passed",
                    size: "Small",
                    isSubtle: true,
                    horizontalAlignment: "Center",
                    spacing: "None",
                    wrap: true,
                  },
                ],
              },
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: String(failed),
                    weight: "Bolder",
                    size: "ExtraLarge",
                    color: failed > 0 ? "Attention" : "Default",
                    horizontalAlignment: "Center",
                  },
                  {
                    type: "TextBlock",
                    text: "❌ Failed",
                    size: "Small",
                    isSubtle: true,
                    horizontalAlignment: "Center",
                    spacing: "None",
                    wrap: true,
                  },
                ],
              },
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: String(skipped),
                    weight: "Bolder",
                    size: "ExtraLarge",
                    color: "Warning",
                    horizontalAlignment: "Center",
                  },
                  {
                    type: "TextBlock",
                    text: "⏭ Skipped",
                    size: "Small",
                    isSubtle: true,
                    horizontalAlignment: "Center",
                    spacing: "None",
                    wrap: true,
                  },
                ],
              },
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: String(flaky),
                    weight: "Bolder",
                    size: "ExtraLarge",
                    color: flaky > 0 ? "Warning" : "Default",
                    horizontalAlignment: "Center",
                  },
                  {
                    type: "TextBlock",
                    text: "⚠️ Flaky",
                    size: "Small",
                    isSubtle: true,
                    horizontalAlignment: "Center",
                    spacing: "None",
                    wrap: true,
                  },
                ],
              },
            ],
          },

          // ── DETAILS FACTSET ─────────────────────────────────────
          {
            type: "FactSet",
            spacing: "Medium",
            separator: true,
            facts: [
              { title: "📦 Total", value: String(total) },
              { title: "📊 Pass Rate", value: `${passRate}%` },
              { title: "⏱ Duration", value: formatDuration(stats?.duration) },
              { title: "🌐 Browser", value: projects },
              { title: "🔁 Workers", value: String(cfg?.workers ?? 1) },
              { title: "⚙️ Config", value: configFile },
              {
                title: "🌿 Branch",
                value: process.env.GITHUB_REF_NAME
                  ? `${process.env.GITHUB_REF_NAME} #${process.env.GITHUB_RUN_NUMBER ?? ""}`
                  : "local run",
              },
            ],
          },

          // ── FAILED TEST LIST (only if failures exist) ───────────
          ...(failedTests.length > 0
            ? [
                {
                  type: "TextBlock",
                  text: "❌ Failed Tests",
                  weight: "Bolder",
                  size: "Small",
                  color: "Attention",
                  spacing: "Medium",
                  separator: true,
                },
                {
                  type: "TextBlock",
                  text: failedTests.map((t) => `- ${t.specTitle}`).join("\n"),
                  wrap: true,
                  size: "Small",
                  isSubtle: true,
                  spacing: "Small",
                },
              ]
            : []),

          // ── ACTION BUTTON (inline, webhook-safe) ────────────────
          {
            type: "ActionSet",
            spacing: "Medium",
            separator: true,
            actions: [
              {
                type: "Action.OpenUrl",
                title: "🔍 View GitHub Actions Run",
                url: process.env.GITHUB_RUN_URL || "#",
              },
            ],
          },
        ],
      },
    },
  ],
};

export async function sendTeamsNotification() {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("TEAMS_WEBHOOK_URL is not defined.");
  try {
    await axios.post(webhookUrl, card);
    console.log("✅ Teams notification sent successfully.");
  } catch (error) {
    console.error("❌ Failed to send Teams notification:", error);
  }
}

sendTeamsNotification();
