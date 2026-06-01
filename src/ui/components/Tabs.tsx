import type { ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabItem<Id extends string> {
  id: Id;
  label: ReactNode;
  icon?: ReactNode;
  pill?: ReactNode;
}

export interface TabsProps<Id extends string> {
  items: ReadonlyArray<TabItem<Id>>;
  active: Id;
  onChange(id: Id): void;
}

export function Tabs<Id extends string>({ items, active, onChange }: TabsProps<Id>) {
  return (
    <div className={styles.tabs} role="tablist">
      {items.map(item => {
        const isActive = item.id === active;
        const cls = [styles.tab, isActive && styles.active].filter(Boolean).join(" ");
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cls}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.pill !== undefined && <span className={styles.pill}>{item.pill}</span>}
          </button>
        );
      })}
      <div className={styles.spacer} />
    </div>
  );
}
