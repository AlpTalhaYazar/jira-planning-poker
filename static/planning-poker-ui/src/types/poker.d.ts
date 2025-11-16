export type DeckValue = string;
export type ParticipantRole = 'moderator' | 'participant';
export interface Issue {
    key: string;
    summary: string;
    status: string;
    estimate?: string;
    link?: string;
}
export interface Participant {
    id: string;
    name: string;
    role: ParticipantRole;
    avatarColor?: string;
}
export interface SessionDefinition {
    id: string;
    name: string;
    deckValues: DeckValue[];
    projectKey: string;
    issues: Issue[];
    participants: Participant[];
    initialVotes?: Record<string, Record<string, DeckValue | null>>;
}
