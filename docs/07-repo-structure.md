# Suggested Repository Structure

.
├── manifest.yml
├── src/
│ ├── index.ts # Forge backend entrypoint (resolvers wired through ContextService)
│ ├── api/ # Backend domain logic
│ │ ├── sessions.ts
│ │ ├── votes.ts
│ │ ├── jira.ts
│ │ └── config.ts
│ ├── services/
│ │ ├── contextService.ts
│ │ └── projectPermissions.ts
│ ├── tasks/
│ │ └── cleanupSessions.ts
│ ├── utils/
│ │ ├── context.ts
│ │ └── logger.ts
│ └── types/
│   └── domain.ts
├── static/
│ └── planning-poker-ui/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│     ├── main.tsx
│     ├── App.tsx
│     ├── features/
│     │ ├── session/
│     │ └── voting/
│     ├── hooks/
│     └── components/
├── docs/
│ ├── 01-product-overview.md
│ ├── 02-tech-stack-decision.md
│ ├── 03-requirements.md
│ ├── 04-architecture.md
│ ├── 05-manifest-draft.yml
│ ├── 06-implementation-plan.md
│ ├── 07-repo-structure.md
│ ├── 08-security.md
│ └── analyze/
│   ├── audit-report.md
│   └── remediation-checklist.md
└── tests/
  ├── setup.ts / helpers
  ├── forge-api-mock.ts
  ├── contextService.test.ts
  ├── sessions.test.ts
  ├── votes.test.ts
  ├── jira.test.ts
  ├── realtime.test.ts
  ├── cleanupSessions.test.ts
  └── smoke.test.ts
