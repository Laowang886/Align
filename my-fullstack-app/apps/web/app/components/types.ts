import type { ComponentProps } from "react";

export type IconName =
  | "menu"
  | "external"
  | "bell"
  | "chevron"
  | "user"
  | "dashboard"
  | "board"
  | "clock"
  | "book"
  | "chat"
  | "users"
  | "clipboard"
  | "check"
  | "trend"
  | "calendar"
  | "sparkles"
  | "plus"
  | "alert"
  | "activity"
  | "mail"
  | "eye"
  | "edit"
  | "file"
  | "save"
  | "settings"
  | "logOut";

export type NavigationItem = {
  label: string;
  icon: IconName;
};

export type IconProps = {
  name: IconName;
  size?: number;
} & Omit<ComponentProps<"svg">, "name">;
