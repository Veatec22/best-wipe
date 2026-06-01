export const FACTS = {
  aov_average_over_lines_not_orders: { type: "boolean" },
  aov_clean: { type: "boolean" },
  aov_wrong_source: { type: "boolean" },
  ceo_net_revenue_clean: { type: "boolean" },
  ceo_net_revenue_without_refunds: { type: "boolean" },
  ceo_net_revenue_wrong_source: { type: "boolean" },
  ceo_received_wrong_aov: { type: "boolean" },
  city_complaints_clean: { type: "boolean" },
  city_complaints_includes_test_accounts: { type: "boolean" },
  day1_kuba_access_check_clean: { type: "boolean" },
  day1_sent_count_from_wrong_table: { type: "boolean" },
  day1_users_metric_includes_test_accounts: { type: "boolean" },
  gender_revenue_clean: { type: "boolean" },
  gender_revenue_includes_test_accounts: { type: "boolean" },
  missed_avatar_reminders: { type: "number" },
  monthly_sales_clean: { type: "boolean" },
  monthly_sales_wrong_month_range: { type: "boolean" },
  monthly_sales_wrong_source: { type: "boolean" },
  orders_by_day_clean: { type: "boolean" },
  orders_by_day_not_deduplicated: { type: "boolean" },
  player_helped_pm_coverup: { type: "boolean" },
  player_skipped_poll: { type: "boolean" },
  player_voted_poll_green: { type: "boolean" },
  player_voted_poll_red: { type: "boolean" },
  pm_coverup_sent_correct_report: { type: "boolean" },
  pm_coverup_sent_flawed_report: { type: "boolean" },
  pm_fired_week1: { type: "boolean" },
  pm_revenue_by_country_report_clean: { type: "boolean" },
  pm_revenue_report_includes_test_accounts: { type: "boolean" },
  pm_revenue_report_wrong_chart_type: { type: "boolean" },
  pm_revenue_report_wrong_source_tables: { type: "boolean" },
  pm_revenue_report_wrong_x_axis: { type: "boolean" },
  pm_revenue_report_wrong_y_axis: { type: "boolean" },
  poll_winner_product_id: { type: "string" },
  promoted_person_id: { type: "string" },
  refund_reasons_clean: { type: "boolean" },
  revenue_after_refunds_clean: { type: "boolean" },
  revenue_after_refunds_duplicated_via_join: { type: "boolean" },
  revenue_after_refunds_wrong_source: { type: "boolean" },
  sales_by_country_clean: { type: "boolean" },
  sales_by_country_orders_not_deduplicated: { type: "boolean" },
  sales_by_country_wrong_source: { type: "boolean" },
  test_accounts_impact_filter_inverted: { type: "boolean" },
  test_accounts_impact_measured: { type: "boolean" },
  test_accounts_impact_wrong_source: { type: "boolean" },
  top_campaigns_clean: { type: "boolean" },
  top_campaigns_includes_null: { type: "boolean" },
  top_campaigns_wrong_source: { type: "boolean" },
  top_cities_clean: { type: "boolean" },
  top_cities_includes_test_accounts: { type: "boolean" },
  top_cities_wrong_source: { type: "boolean" },
  top_complaints_users_clean: { type: "boolean" },
  top_complaints_users_wrong_source: { type: "boolean" },
  top_products_clean: { type: "boolean" },
  top_products_unsorted: { type: "boolean" },
  top_products_wrong_row_count: { type: "boolean" },
  top_products_wrong_source: { type: "boolean" },
  top_refunded_products_clean: { type: "boolean" },
  top_refunded_products_wrong_source: { type: "boolean" },
} as const satisfies Record<string, FactSpec>;

export interface BooleanFactSpec {
  type: "boolean";
}

export interface NumberFactSpec {
  type: "number";
}

export interface StringFactSpec {
  type: "string";
}

export type FactSpec = BooleanFactSpec | NumberFactSpec | StringFactSpec;

export type FactKey = keyof typeof FACTS;

export type FactValueOf<K extends FactKey> = (typeof FACTS)[K]["type"] extends "boolean"
  ? boolean
  : (typeof FACTS)[K]["type"] extends "number"
    ? number
    : string;

export type FactValue = {
  [K in FactKey]: FactValueOf<K>;
}[FactKey];

export type BooleanFactKey = {
  [K in FactKey]: (typeof FACTS)[K]["type"] extends "boolean" ? K : never;
}[FactKey];

export type FactCondition =
  | { all: FactCondition[] }
  | { any: FactCondition[] }
  | { not: FactCondition }
  | FactConditionLeaf;

export type FactConditionLeaf = {
  [K in FactKey]: { key: K; equals: FactValueOf<K> };
}[FactKey];

export type SetFactEffect = {
  [K in FactKey]: { type: "set_fact"; key: K; value: FactValueOf<K> };
}[FactKey];
