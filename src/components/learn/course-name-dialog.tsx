import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { COURSE_NAME_MAX } from "@/lib/study-courses";

interface CourseNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when renaming; empty for a new course. */
  initialName?: string;
  /** Resolves when saved; a rejection keeps the dialog open. */
  onSubmit: (name: string) => Promise<void>;
}

/** Names a new study course, or renames one. */
export function CourseNameDialog({
  open,
  onOpenChange,
  initialName = "",
  onSubmit,
}: CourseNameDialogProps) {
  const renaming = !!initialName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remounted per opening, so the field starts from `initialName`. */}
        {open && (
          <CourseNameForm
            renaming={renaming}
            initialName={initialName}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CourseNameForm({
  renaming,
  initialName,
  onCancel,
  onSubmit,
}: {
  renaming: boolean;
  initialName: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const canSave = !!trimmed && trimmed !== initialName.trim() && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
    } catch {
      // The caller has told the user; staying open lets them try again.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <DialogHeader>
        <DialogTitle>{renaming ? "Byt namn på kursen" : "Ny kurs"}</DialogTitle>
        <DialogDescription>
          {renaming
            ? "Namnet syns bara för dig."
            : "Samla föreläsningar och chattar för en kurs. Chattar i kursen använder materialet du laddar upp."}
        </DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        value={name}
        maxLength={COURSE_NAME_MAX}
        placeholder="t.ex. Linjär algebra"
        aria-label="Kursens namn"
        onChange={(e) => setName(e.target.value)}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" disabled={!canSave}>
          {saving ? "Sparar..." : renaming ? "Spara" : "Skapa kurs"}
        </Button>
      </DialogFooter>
    </form>
  );
}
