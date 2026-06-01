/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import {
  buildAskReportMessages,
  buildAskSqlMessages,
  extractReportChartConfig,
  extractSqlSelect,
} from "./prompts";

const schemaTables = {
  users: ["id", "name", "is_test"],
  sales: ["id", "user_id", "net"],
};

describe("buildAskSqlMessages", () => {
  test("includes game context, task, schema, and optional user SQL", () => {
    const messages = buildAskSqlMessages({
      gameContext: "Best Wipe context",
      taskBrief: "Count real users.",
      schemaTables,
      userSql: "SELECT * FROM users;",
      modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("WYGENERUJ WYLACZNIE");
    expect(messages[1].content).toContain("Best Wipe context");
    expect(messages[1].content).toContain("Count real users.");
    expect(messages[1].content).toContain("users(id, name, is_test)");
    expect(messages[1].content).toContain("SELECT * FROM users;");
  });
});

describe("extractSqlSelect", () => {
  test("strips markdown fences and keeps a single SELECT statement", () => {
    expect(extractSqlSelect("```sql\nSELECT id\nFROM users;\n```")).toBe("SELECT id\nFROM users;");
  });

  test("rejects non-select SQL", () => {
    expect(() => extractSqlSelect("DELETE FROM users;")).toThrow("AI did not return a SELECT");
  });

  test("rejects multiple statements", () => {
    expect(() => extractSqlSelect("SELECT * FROM users; SELECT * FROM sales;")).toThrow(
      "AI returned more than one SQL statement",
    );
  });
});

describe("buildAskReportMessages", () => {
  test("includes task brief, result columns, and sample rows", () => {
    const messages = buildAskReportMessages({
      taskBrief: "Show revenue by country.",
      columns: ["country_name", "revenue"],
      sampleRows: [
        ["Poland", 120],
        ["Germany", 90],
      ],
      modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain("JSON");
    expect(messages[1].content).toContain("Show revenue by country.");
    expect(messages[1].content).toContain("country_name, revenue");
    expect(messages[1].content).toContain("Poland");
  });
});

describe("extractReportChartConfig", () => {
  test("extracts a valid chart config JSON object", () => {
    expect(
      extractReportChartConfig(
        '```json\n{"chartType":"bar","xColumn":"country_name","yColumn":"revenue"}\n```',
        ["country_name", "revenue"],
      ),
    ).toEqual({
      chartType: "bar",
      xColumn: "country_name",
      yColumn: "revenue",
    });
  });

  test("rejects unknown columns", () => {
    expect(() =>
      extractReportChartConfig('{"chartType":"bar","xColumn":"country_name","yColumn":"missing"}', [
        "country_name",
        "revenue",
      ]),
    ).toThrow("AI returned a chart config with unknown columns");
  });
});
