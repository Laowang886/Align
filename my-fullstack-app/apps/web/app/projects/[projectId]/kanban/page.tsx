import WorkspaceApp from "../../../components/workspace/WorkspaceApp";

export default async function ProjectKanbanPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ taskId?: string }>;
}) {
  const { projectId } = await params;
  const { taskId } = await searchParams;
  return (
    <WorkspaceApp
      projectId={projectId}
      initialView="Kanban Board"
      targetTaskId={taskId}
    />
  );
}
