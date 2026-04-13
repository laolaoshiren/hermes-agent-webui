export function getScopedApprovalReviewWorkspaceSlug(
  activeWorkspaceId: string | null | undefined,
  activeWorkspaceSlug: string | null | undefined,
  relatedRunWorkspaceId: string | null | undefined,
) {
  if (!activeWorkspaceId || !activeWorkspaceSlug || !relatedRunWorkspaceId) {
    return null;
  }

  return activeWorkspaceId === relatedRunWorkspaceId ? activeWorkspaceSlug : null;
}
