export function getScopedHandoffWorkspaceSlug(
  activeWorkspaceId: string | null | undefined,
  activeWorkspaceSlug: string | null | undefined,
  selectedRunWorkspaceId: string | null | undefined,
) {
  if (!activeWorkspaceId || !activeWorkspaceSlug || !selectedRunWorkspaceId) {
    return null;
  }

  return activeWorkspaceId === selectedRunWorkspaceId ? activeWorkspaceSlug : null;
}
