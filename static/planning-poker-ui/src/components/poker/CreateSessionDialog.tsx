import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; deck: string; jql?: string | null }) => void;
}

export function CreateSessionDialog({ open, onOpenChange, onSubmit }: CreateSessionDialogProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: String(formData.get("name") ?? ""),
      deck: String(formData.get("deck") ?? ""),
      jql: (formData.get("jql") as string | null) ?? null,
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Configure your poker session details. You can change these later if needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Session Name</Label>
            <Input id="name" name="name" placeholder="e.g. Sprint 24 Planning" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deck">Estimation Deck</Label>
            <Select name="deck" defaultValue="Fibonacci">
              <SelectTrigger>
                <SelectValue placeholder="Select a deck" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fibonacci">Fibonacci (0, 0.5, 1, 2, 3...)</SelectItem>
                <SelectItem value="T-Shirt">T-Shirt Sizes (XS, S, M, L...)</SelectItem>
                <SelectItem value="Powers">Powers of 2 (0, 1, 2, 4, 8...)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Determines the card values available to participants.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jql">JQL Filter (Optional)</Label>
            <Textarea 
              id="jql" 
              name="jql" 
              placeholder="project = 'PAY' AND sprint in openSprints()" 
              className="font-mono text-xs"
            />
            <p className="text-xs text-slate-500">Pre-load issues matching this query.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#0052CC] hover:bg-[#0047B3]">Create Session</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
