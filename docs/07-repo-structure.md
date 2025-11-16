# Suggested Repository Structure

.
├── manifest.yml
├── src/
│ ├── index.ts # Forge backend entrypoint (resolvers)
│ ├── api/ # Backend domain logic
│ │ ├── sessions.ts
│ │ ├── votes.ts
│ │ ├── jira.ts
│ │ └── config.ts
│ └── types/
│ └── domain.ts
├── static/
│ └── planning-poker-ui/
│ ├── package.json
│ ├── tsconfig.json
│ ├── vite.config.ts or similar
│ └── src/
│ ├── main.tsx
│ ├── App.tsx
│ ├── features/
│ │ ├── sessions/
│ │ └── voting/
│ └── components/
├── docs/
│ ├── 01-product-overview.md
│ ├── 02-tech-stack-decision.md
│ ├── 03-requirements.md
│ ├── 04-architecture.md
│ ├── 05-manifest-draft.yml
│ ├── 06-implementation-plan.md
│ └── 07-repo-structure.md
└── tests/
├── backend/
└── frontend/
