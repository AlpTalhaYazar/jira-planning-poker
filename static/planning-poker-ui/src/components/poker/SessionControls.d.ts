interface SessionControlsProps {
    session: {
        id: string;
        status: 'waiting' | 'active' | 'paused' | 'completed' | 'archived';
    };
    isModerator: boolean;
    onPause: () => void;
    onResume: () => void;
    onComplete: () => void;
    onSettings: () => void;
    loading?: boolean;
}
export declare function SessionControls({ session, isModerator, onPause, onResume, onComplete, onSettings, loading, }: SessionControlsProps): import("react/jsx-runtime").JSX.Element | null;
export {};
