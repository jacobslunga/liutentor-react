import { ActionList, ActionMenu, AnchoredOverlay, Label } from "@primer/react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { passRateClass } from "@/lib/course-stats";
import { getExamPrefix } from "@/lib/exams";
import { cn } from "@/lib/utils";
import { sortExams, useExamSortPreference } from "@/stores/exam-sort";
import type { Exam } from "@/types/exam";
import { Button } from "@/components/ui/button";

function hasPassRate(exam: Exam) {
  return Number.isFinite(Number(exam.pass_rate)) && Number(exam.pass_rate) > 0;
}

interface ExamPickerProps {
  exams: Exam[];
  examId: string;
  courseCode: string;
  /** Rendered as the trigger's label. */
  children: React.ReactNode;
  triggerClassName?: string;
  triggerSize?: "small" | "medium";
  align?: "start" | "center" | "end";
}

/** Popover listing all exams of the course; picking one navigates to it. */
export function ExamPicker({
  exams,
  examId,
  courseCode,
  children,
  triggerClassName,
  triggerSize = "medium",
  align = "start",
}: ExamPickerProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { sortBy, sortDirection, setSortBy, setSortDirection } =
    useExamSortPreference("exam-picker");
  const sorted = useMemo(
    () => sortExams(exams, sortBy, sortDirection),
    [exams, sortBy, sortDirection],
  );

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() =>
      listRef.current
        ?.querySelector('[data-current="true"]')
        ?.scrollIntoView({ block: "center" }),
    );
  }, [open]);

  function pick(exam: Exam) {
    setOpen(false);
    if (String(exam.id) === examId) return;
    void navigate({
      to: "/search/$courseCode/$examId",
      params: { courseCode, examId: String(exam.id) },
    });
  }

  const DirectionIcon = sortDirection === "desc" ? ArrowDownIcon : ArrowUpIcon;

  return (
    <AnchoredOverlay
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      align={align}
      width="auto"
      renderAnchor={(anchorProps) => (
        <Button variant="outline" {...anchorProps} size={triggerSize} aria-label="Byt tenta" className={triggerClassName}>
          {children}
        <ChevronDownIcon
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            /></Button>
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="text-xs font-semibold">Alla tentor</span>
        <div className="flex items-center gap-1.5">
          <ActionMenu>
            <ActionMenu.Button
              size="small"
              leadingVisual={DirectionIcon}
              aria-label="Sortera tentor"
            >
              {sortBy === "date" ? "Datum" : "Godkänd"}
            </ActionMenu.Button>
            <ActionMenu.Overlay align="end" width="small">
              <ActionList>
                <ActionList.Group selectionVariant="single">
                  <ActionList.GroupHeading>
                    Sortera efter
                  </ActionList.GroupHeading>
                  <ActionList.Item
                    selected={sortBy === "date"}
                    onSelect={() => setSortBy("date")}
                  >
                    Datum
                  </ActionList.Item>
                  <ActionList.Item
                    selected={sortBy === "pass-rate"}
                    onSelect={() => setSortBy("pass-rate")}
                  >
                    Godkänd
                  </ActionList.Item>
                </ActionList.Group>
                <ActionList.Divider />
                <ActionList.Group selectionVariant="single">
                  <ActionList.GroupHeading>Ordning</ActionList.GroupHeading>
                  <ActionList.Item
                    selected={sortDirection === "desc"}
                    onSelect={() => setSortDirection("desc")}
                  >
                    Fallande
                  </ActionList.Item>
                  <ActionList.Item
                    selected={sortDirection === "asc"}
                    onSelect={() => setSortDirection("asc")}
                  >
                    Stigande
                  </ActionList.Item>
                </ActionList.Group>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
          <span className="rounded-sm bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
            {sorted.length} st
          </span>
        </div>
      </div>

      {/* The padding sits inside the scroller, so rows clip flush against
          the header instead of peeking through a gap above them. */}
      <div
        ref={listRef}
        className="max-h-[min(20rem,60dvh)] max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        <div className="space-y-0.5 p-1.5">
          {sorted.map((exam) => {
            const current = String(exam.id) === examId;
            return (
              <button
                key={exam.id}
                type="button"
                data-current={current}
                className={cn(
                  "grid w-full grid-cols-[3.25rem_6.75rem_3.75rem_3.5rem_1rem] items-center gap-x-2 rounded-sm px-3 py-2 text-left transition-colors duration-150",
                  current
                    ? "bg-accent font-semibold"
                    : "text-foreground/90 hover:bg-muted hover:text-foreground",
                )}
                onClick={() => pick(exam)}
              >
                <span className="truncate text-sm font-normal">
                  {getExamPrefix(exam)}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {exam.exam_date}
                </span>
                {exam.has_solution ? (
                  <Label
                    variant="done"
                    className="col-start-3 justify-self-start"
                  >
                    Facit
                  </Label>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    "col-start-4 justify-self-end font-mono text-xs tabular-nums",
                    hasPassRate(exam)
                      ? passRateClass(exam.pass_rate)
                      : "text-muted-foreground/50",
                  )}
                >
                  {hasPassRate(exam)
                    ? `${Number(exam.pass_rate).toFixed(1)}%`
                    : "–"}
                </span>
                {current ? (
                  <CheckIcon className="col-start-5 size-4 text-primary" />
                ) : (
                  <span className="col-start-5 size-4" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </AnchoredOverlay>
  );
}
