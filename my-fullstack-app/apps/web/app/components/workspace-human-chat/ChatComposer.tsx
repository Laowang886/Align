"use client";

import styles from "../../page.module.css";

type ChatComposerProps = {
  value: string;
  disabled: boolean;
  sending: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatComposer({
  value,
  disabled,
  sending,
  placeholder,
  onChange,
  onSend,
}: ChatComposerProps) {
  return (
    <form
      className={styles.humanChatComposer}
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
      />
      <button type="submit" disabled={disabled || sending || !value.trim()}>
        {sending ? "Sending" : "Send"}
      </button>
    </form>
  );
}
