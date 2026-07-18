import WorkspaceApp from "../../../components/workspace/WorkspaceApp";

export default async function ProjectSprintsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <WorkspaceApp projectId={projectId} initialView="Sprints" />;
}
