import WorkspaceApp from "../../../components/workspace/WorkspaceApp";

export default async function AiChatRoute({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <WorkspaceApp
      initialAiChatMode="page"
      initialView="AI Chat"
      workspaceId={workspaceId}
    />
  );
}
