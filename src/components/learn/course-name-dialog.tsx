import { Dialog, TextInput } from "@primer/react";
import { useId, useState } from "react";
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

  // Unmounted while closed, so the field starts from `initialName` each time.
  if (!open) return null;

  return (
    <CourseNameForm
      renaming={renaming}
      initialName={initialName}
      onCancel={() => onOpenChange(false)}
      onSubmit={onSubmit}
    />
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
  const formId = useId();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const canSave = !!trimmed && trimmed !== initialName.trim();

  async function save() {
    if (!canSave || saving) return;
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
    <Dialog
      width="large"
      title={renaming ? "Byt namn på kursen" : "Ny kurs"}
      subtitle={
        renaming
          ? "Namnet syns bara för dig."
          : "Samla föreläsningar och chattar för en kurs. Chattar i kursen använder materialet du laddar upp."
      }
      onClose={onCancel}
      footerButtons={[
        { content: "Avbryt", onClick: onCancel },
        {
          content: renaming ? "Spara" : "Skapa kurs",
          buttonType: "primary",
          type: "submit",
          form: formId,
          disabled: !canSave,
          loading: saving,
        },
      ]}
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextInput
          block
          autoFocus
          value={name}
          maxLength={COURSE_NAME_MAX}
          placeholder="t.ex. Linjär algebra"
          aria-label="Kursens namn"
          onChange={(e) => setName(e.target.value)}
        />
      </form>
    </Dialog>
  );
}
