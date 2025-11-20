interface ForgeProjectContext {
  context?:
    | {
        extension?: {
          project?: {
            key?: string;
          };
        };
      }
    | undefined;
}

export const getContextProjectKey = (req: ForgeProjectContext): string => {
  const projectKey = req.context?.extension?.project?.key;
  if (!projectKey) {
    throw new Error("Project context is required for this action.");
  }
  return projectKey;
};

export const assertProjectContext = (
  req: ForgeProjectContext,
  requestedProjectKey?: string | null
): string => {
  const contextKey = getContextProjectKey(req);
  if (requestedProjectKey && requestedProjectKey !== contextKey) {
    throw new Error(
      "Project mismatch. Please open the app from the intended project."
    );
  }
  return contextKey;
};
