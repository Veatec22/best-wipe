import { expect, test } from "bun:test";
import { selectRuntimeRows } from "./datasetLoader";

test("selectRuntimeRows gates rows by day and strips loader metadata", () => {
  const rows = [
    { id: 1, net: 10, available_from_day: 1, variant_key: "" },
    { id: 2, net: 20, available_from_day: 2, variant_key: "" },
    { id: 3, net: 30, available_from_day: 1, variant_key: "poll_product_green" },
    { id: 4, net: 40, available_from_day: 1, variant_key: "poll_product_red" },
  ];

  expect(
    selectRuntimeRows(rows, {
      day: 1,
      activeVariantKeys: new Set(["poll_product_green"]),
    }),
  ).toEqual([
    { id: 1, net: 10 },
    { id: 3, net: 30 },
  ]);
});

test("selectRuntimeRows treats missing metadata as base visible data", () => {
  expect(
    selectRuntimeRows([{ id: 1, name: "Basic Roll" }], {
      day: 1,
      activeVariantKeys: new Set(),
    }),
  ).toEqual([{ id: 1, name: "Basic Roll" }]);
});
