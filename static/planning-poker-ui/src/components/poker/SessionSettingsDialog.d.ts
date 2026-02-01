interface SessionSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    onUpdate: () => void;
}
export declare function SessionSettingsDialog({ open, onOpenChange, session, onUpdate }: SessionSettingsDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
