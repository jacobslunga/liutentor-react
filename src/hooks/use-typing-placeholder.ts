import { useEffect, type RefObject } from "react";
import { useCourseCodes } from "@/queries/exams";

const TYPE_MS = 55;
const DELETE_MS = 30;
const HOLD_MS = 1200;
const GAP_MS = 500;

/**
 * Types example course codes into an input's placeholder. Writes the attribute
 * directly so the animation never re-renders; the placeholder is hidden while
 * the field has a value, so it simply keeps running underneath.
 */
export function useTypingPlaceholder(
  inputRef: RefObject<HTMLInputElement | null>,
  prefix = "",
  enabled = true,
) {
  const { codes } = useCourseCodes();

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !enabled || !codes.length) return;

    const examples = [...codes].sort(() => Math.random() - 0.5);
    let index = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = examples[index % examples.length];
      const doneTyping = chars === current.length && !deleting;
      const doneDeleting = chars === 0 && deleting;
      const delay = doneTyping ? HOLD_MS : doneDeleting ? GAP_MS : deleting ? DELETE_MS : TYPE_MS;

      timer = setTimeout(() => {
        if (doneTyping) deleting = true;
        else if (doneDeleting) {
          deleting = false;
          index += 1;
        } else {
          chars += deleting ? -1 : 1;
          input.placeholder = `${prefix}${current.slice(0, chars)}`;
        }
        tick();
      }, delay);
    };

    tick();
    return () => clearTimeout(timer);
  }, [codes, inputRef, prefix, enabled]);
}
