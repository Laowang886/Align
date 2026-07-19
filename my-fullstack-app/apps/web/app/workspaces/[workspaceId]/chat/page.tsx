import WorkspaceApp from "../../../components/workspace/WorkspaceApp";

export default async function WorkspaceChatPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <WorkspaceApp workspaceId={workspaceId} initialView="Workspace Chat" />;
}
