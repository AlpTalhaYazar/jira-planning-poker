interface CreateSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: {
        name: string;
        deck: string;
        jql?: string | null;
    }) => void;
}
export declare function CreateSessionDialog({ open, onOpenChange, onSubmit }: CreateSessionDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
