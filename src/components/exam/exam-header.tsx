import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  BookOpenCheckIcon,
  Columns2Icon,
  DownloadIcon,
  EllipsisIcon,
  FileArchiveIcon,
  FileTextIcon,
  MaximizeIcon,
  MinimizeIcon,
  MonitorIcon,
  MoonIcon,
  PanelRightOpenIcon,
  SettingsIcon,
  SunIcon,
  UploadIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { memo, useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { downloadBoth, downloadFile } from "@/lib/download";
import { useChatStore } from "@/stores/chat";
import { useExamViewStore } from "@/stores/exam-view";
import { useSettingsStore } from "@/stores/settings";
import { useUploadModal } from "@/stores/upload-modal";
import type { Exam } from "@/types/exam";
import { ExamPicker } from "./exam-picker";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/shared/segmented-control";

interface ExamHeaderProps {
  exams: Exam[];
  examId: string;
  courseCode: string;
  examPdfUrl: string;
  examDate: string;
  solutionPdfUrl: string | null;
}


export const ExamHeader = memo(function ExamHeader({
  exams,
  examId,
  courseCode,
  examPdfUrl,
  examDate,
  solutionPdfUrl,
}: ExamHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="pointer-events-none relative isolate flex h-12 w-full items-center justify-between px-3">
      <ButtonGroup className="pointer-events-auto">
        <IconButton
          variant="outline"
          aria-label="Tillbaka till kursen"
          onClick={() =>
            void navigate({ to: "/search/$courseCode", params: { courseCode } })
          }
        >
          <ArrowLeftIcon />
        </IconButton>
        <ExamPicker exams={exams} examId={examId} courseCode={courseCode}>
          <span className="font-semibold">{examDate}</span>
        </ExamPicker>
      </ButtonGroup>

      <div className="pointer-events-auto flex items-center gap-2">
        <ChatToggle />
        <LayoutTabs />
        <ActionsMenu
          courseCode={courseCode}
          examDate={examDate}
          examPdfUrl={examPdfUrl}
          solutionPdfUrl={solutionPdfUrl}
        />
      </div>
    </div>
  );
});

function ChatToggle() {
  const isOpen = useChatStore((s) => s.isOpen);
  const toggle = useChatStore((s) => s.toggle);

  return <Button onClick={toggle}>{isOpen ? "Stäng" : "Chatt"}</Button>;
}

const LAYOUT_TABS = [
  {
    value: "exam-with-facit",
    icon: Columns2Icon,
    label: "Visa tenta och facit",
  },
  { value: "exam-only", icon: PanelRightOpenIcon, label: "Visa endast tentan" },
] as const;

function LayoutTabs() {
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const setLayoutMode = useSettingsStore((s) => s.setLayoutMode);
  const closeChat = useChatStore((s) => s.close);

  return (
    <SegmentedControl
      aria-label="Layout"
      value={layoutMode}
      onValueChange={(value) => {
        setLayoutMode(value);
        closeChat();
      }}
      options={LAYOUT_TABS.map(({ value, icon, label }) => ({
        value,
        icon,
        label,
        iconOnly: true,
      }))}
    />
  );
}

const THEMES = [
  { value: "light", label: "Ljust" },
  { value: "dark", label: "Mörkt" },
  { value: "system", label: "System" },
] as const;

function ActionsMenu({
  courseCode,
  examDate,
  examPdfUrl,
  solutionPdfUrl,
}: {
  courseCode: string;
  examDate: string;
  examPdfUrl: string;
  solutionPdfUrl: string | null;
}) {
  const focusMode = useExamViewStore((s) => s.focusMode);
  const toggleFocusMode = useExamViewStore((s) => s.toggleFocusMode);
  const openUploadModal = useUploadModal((s) => s.open);
  const { theme = "system", setTheme } = useTheme();
  const ThemeIcon =
    theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label="Fler åtgärder">
            <EllipsisIcon />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={toggleFocusMode}>
            {focusMode ? <MinimizeIcon /> : <MaximizeIcon />}
            {focusMode ? "Avsluta fokusläge" : "Fokusläge"}
            <DropdownMenuShortcut>F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ThemeIcon />
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-40">
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                {THEMES.map(({ value, label }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <SettingsIcon />
            Inställningar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openUploadModal(courseCode)}>
            <UploadIcon />
            Ladda upp tenta/facit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <DownloadIcon />
              Ladda ned
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-48">
              <DropdownMenuItem
                onSelect={() =>
                  void downloadFile(
                    examPdfUrl,
                    `${courseCode}_${examDate}_EXAM.pdf`,
                  )
                }
              >
                <FileTextIcon />
                Tenta
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!solutionPdfUrl}
                onSelect={() =>
                  solutionPdfUrl &&
                  void downloadFile(
                    solutionPdfUrl,
                    `${courseCode}_${examDate}_SOLUTION.pdf`,
                  )
                }
              >
                <BookOpenCheckIcon />
                Facit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!solutionPdfUrl}
                onSelect={() =>
                  solutionPdfUrl &&
                  downloadBoth(courseCode, examDate, examPdfUrl, solutionPdfUrl)
                }
              >
                <FileArchiveIcon />
                Tenta och facit
                <DropdownMenuShortcut>.zip</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
