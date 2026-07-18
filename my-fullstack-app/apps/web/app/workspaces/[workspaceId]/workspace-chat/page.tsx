import WorkspaceApp from "../../../components/workspace/WorkspaceApp";

export default async function WorkspaceChatRoute({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <WorkspaceApp initialView="Workspace Chat" workspaceId={workspaceId} />;
}
