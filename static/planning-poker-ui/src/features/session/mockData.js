const deck = ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'];
export const mockSessions = [
    {
        id: 'session-alpha',
        name: 'Sprint 42 – Grooming',
        projectKey: 'SCRUM',
        deckValues: deck,
        participants: [
            { id: 'acc-1', name: 'Aylin Demir', role: 'moderator', avatarColor: '#0052CC' },
            { id: 'acc-2', name: 'Liam Patel', role: 'participant', avatarColor: '#6554C0' },
            { id: 'acc-3', name: 'Sefa Kaya', role: 'participant', avatarColor: '#FF5630' },
            { id: 'acc-4', name: 'Emily Wong', role: 'participant', avatarColor: '#36B37E' },
            { id: 'acc-5', name: 'David Hernandez', role: 'participant', avatarColor: '#FF8B00' },
        ],
        issues: [
            {
                key: 'SCRUM-112',
                summary: 'Allow moderators to resend invites to Planning Poker session',
                status: 'Selected for Development',
                estimate: '—',
                link: 'https://dias-dev.atlassian.net/browse/SCRUM-112',
            },
            {
                key: 'SCRUM-113',
                summary: 'Add avatars to vote reveal cards',
                status: 'Backlog',
                estimate: '3',
                link: 'https://dias-dev.atlassian.net/browse/SCRUM-113',
            },
            {
                key: 'SCRUM-114',
                summary: 'Spike: Evaluate Atlaskit Smart Links inside Custom UI',
                status: 'Backlog',
                estimate: '?',
                link: 'https://dias-dev.atlassian.net/browse/SCRUM-114',
            },
        ],
        initialVotes: {
            'SCRUM-112': {
                'acc-1': '3',
                'acc-2': '5',
                'acc-3': null,
                'acc-4': '5',
                'acc-5': null,
            },
            'SCRUM-113': {
                'acc-1': null,
                'acc-2': null,
                'acc-3': null,
                'acc-4': null,
                'acc-5': null,
            },
            'SCRUM-114': {
                'acc-1': null,
                'acc-2': null,
                'acc-3': null,
                'acc-4': null,
                'acc-5': null,
            },
        },
    },
    {
        id: 'session-beta',
        name: 'Release Hardening Catch-up',
        projectKey: 'MKT',
        deckValues: ['XS', 'S', 'M', 'L', 'XL', '?'],
        participants: [
            { id: 'acc-6', name: 'Moderator Bot', role: 'moderator', avatarColor: '#8777D9' },
            { id: 'acc-7', name: 'Ivy Chen', role: 'participant', avatarColor: '#FF7452' },
            { id: 'acc-8', name: 'Samuel Aziz', role: 'participant', avatarColor: '#36B37E' },
        ],
        issues: [
            {
                key: 'MKT-34',
                summary: 'Marketing site hero animation polish',
                status: 'Ready for estimation',
                estimate: '—',
            },
            {
                key: 'MKT-41',
                summary: 'Upgrade analytics SDK',
                status: 'Backlog',
                estimate: 'M',
            },
        ],
    },
];
