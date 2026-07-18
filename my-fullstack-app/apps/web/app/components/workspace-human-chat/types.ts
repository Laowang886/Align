import type {
  HumanChatChannel,
  HumanChatDirectConversation,
  HumanChatMessage,
} from "../../../lib/api-client";

export type ChatTarget =
  | { type: "channel"; id: string; channel: HumanChatChannel }
  | { type: "dm"; id: string; conversation: HumanChatDirectConversation };

export type { HumanChatChannel, HumanChatDirectConversation, HumanChatMessage };
