import { ActionList, ActionMenu, ButtonGroup, SegmentedControl } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
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

interface ExamHeaderProps {
  exams: Exam[];
  examId: string;
  courseCode: string;
  examPdfUrl: string;
  examDate: string;
  solutionPdfUrl: string | null;
}

/** Floating toolbar over the exam: back, exam picker, chat, layout, actions. */
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
        <IconButton variant="outline" aria-label="Tillbaka till kursen" onClick={() =>
            void navigate({ to: "/search/$courseCode", params: { courseCode } })
          }><ArrowLeftIcon /></IconButton>
        <ExamPicker
          exams={exams}
          examId={examId}
          courseCode={courseCode}
        >
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

  return (
    <Button onClick={toggle}>
      {isOpen ? "Stäng" : "Chatt"}
    </Button>
  );
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
      onChange={(i) => {
        setLayoutMode(LAYOUT_TABS[i].value);
        closeChat();
      }}
    >
      {LAYOUT_TABS.map(({ value, icon, label }) => (
        <SegmentedControl.IconButton
          key={value}
          icon={icon}
          aria-label={label}
          selected={layoutMode === value}
        />
      ))}
    </SegmentedControl>
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
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton variant="ghost" aria-label="Fler åtgärder"><EllipsisIcon /></IconButton>
        </ActionMenu.Anchor>
        <ActionMenu.Overlay align="end" width="medium">
          <ActionList>
            <ActionList.Item onSelect={toggleFocusMode}>
              <ActionList.LeadingVisual>
                {focusMode ? <MinimizeIcon /> : <MaximizeIcon />}
              </ActionList.LeadingVisual>
              {focusMode ? "Avsluta fokusläge" : "Fokusläge"}
              <ActionList.TrailingVisual>
                <KeybindingHint keys="F" size="small" />
              </ActionList.TrailingVisual>
            </ActionList.Item>
            <ActionMenu>
              <ActionMenu.Anchor>
                <ActionList.Item>
                  <ActionList.LeadingVisual>
                    <ThemeIcon />
                  </ActionList.LeadingVisual>
                  Tema
                </ActionList.Item>
              </ActionMenu.Anchor>
              <ActionMenu.Overlay width="small">
                <ActionList selectionVariant="single">
                  {THEMES.map(({ value, label }) => (
                    <ActionList.Item
                      key={value}
                      selected={theme === value}
                      onSelect={() => setTheme(value)}
                    >
                      {label}
                    </ActionList.Item>
                  ))}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
            <ActionList.Item onSelect={() => setSettingsOpen(true)}>
              <ActionList.LeadingVisual>
                <SettingsIcon />
              </ActionList.LeadingVisual>
              Inställningar
            </ActionList.Item>
            <ActionList.Item onSelect={() => openUploadModal(courseCode)}>
              <ActionList.LeadingVisual>
                <UploadIcon />
              </ActionList.LeadingVisual>
              Ladda upp tenta/facit
            </ActionList.Item>
            <ActionList.Divider />
            <ActionMenu>
              <ActionMenu.Anchor>
                <ActionList.Item>
                  <ActionList.LeadingVisual>
                    <DownloadIcon />
                  </ActionList.LeadingVisual>
                  Ladda ned
                </ActionList.Item>
              </ActionMenu.Anchor>
              <ActionMenu.Overlay width="small">
                <ActionList>
                  <ActionList.Item
                    onSelect={() =>
                      void downloadFile(
                        examPdfUrl,
                        `${courseCode}_${examDate}_EXAM.pdf`,
                      )
                    }
                  >
                    <ActionList.LeadingVisual>
                      <FileTextIcon />
                    </ActionList.LeadingVisual>
                    Tenta
                  </ActionList.Item>
                  <ActionList.Item
                    disabled={!solutionPdfUrl}
                    onSelect={() =>
                      solutionPdfUrl &&
                      void downloadFile(
                        solutionPdfUrl,
                        `${courseCode}_${examDate}_SOLUTION.pdf`,
                      )
                    }
                  >
                    <ActionList.LeadingVisual>
                      <BookOpenCheckIcon />
                    </ActionList.LeadingVisual>
                    Facit
                  </ActionList.Item>
                  <ActionList.Divider />
                  <ActionList.Item
                    disabled={!solutionPdfUrl}
                    onSelect={() =>
                      solutionPdfUrl &&
                      downloadBoth(courseCode, examDate, examPdfUrl, solutionPdfUrl)
                    }
                  >
                    <ActionList.LeadingVisual>
                      <FileArchiveIcon />
                    </ActionList.LeadingVisual>
                    Tenta och facit
                    <ActionList.Description>.zip</ActionList.Description>
                  </ActionList.Item>
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </>
  );
}
