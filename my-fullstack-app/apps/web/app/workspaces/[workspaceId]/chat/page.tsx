import WorkspaceApp from "../../../components/workspace/WorkspaceApp";

export default async function WorkspaceChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ channelId?: string; directUserId?: string }>;
}) {
  const { workspaceId } = await params;
  const { channelId, directUserId } = await searchParams;
  return (
    <WorkspaceApp
      workspaceId={workspaceId}
      initialView="Workspace Chat"
      targetChannelId={channelId}
      targetDirectUserId={directUserId}
    />
  );
}
