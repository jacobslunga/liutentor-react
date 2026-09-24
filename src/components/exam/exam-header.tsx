import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  BookOpenCheckIcon,
  Columns2Icon,
  DownloadIcon,
  EllipsisIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MaximizeIcon,
  MessageCircleIcon,
  MinimizeIcon,
  MonitorIcon,
  MoonIcon,
  PanelRightOpenIcon,
  SunIcon,
  UploadIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadFile } from "@/lib/download";
import { useChatStore } from "@/stores/chat";
import { useExamViewStore } from "@/stores/exam-view";
import { useSettingsStore, type LayoutMode } from "@/stores/settings";
import { useUploadModal } from "@/stores/upload-modal";
import type { Exam } from "@/types/exam";
import { ExamPicker } from "./exam-picker";

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
        <Button
          variant="secondary"
          size="icon"
          aria-label="Tillbaka till kursen"
          onClick={() => void navigate({ to: "/search/$courseCode", params: { courseCode } })}
        >
          <ArrowLeftIcon />
        </Button>
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
  const isLoading = useChatStore((s) => s.isLoading);
  const toggle = useChatStore((s) => s.toggle);

  return (
    <Button onClick={toggle}>
      {isLoading ? (
        <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
      ) : (
        <MessageCircleIcon data-icon="inline-start" />
      )}
      {isOpen ? "Stäng" : "Chatt"}
    </Button>
  );
}

const LAYOUT_TABS = [
  { value: "exam-with-facit", icon: Columns2Icon, label: "Visa tenta och facit" },
  { value: "exam-only", icon: PanelRightOpenIcon, label: "Visa endast tentan" },
] as const;

function LayoutTabs() {
  const layoutMode = useSettingsStore((s) => s.layoutMode);
  const setLayoutMode = useSettingsStore((s) => s.setLayoutMode);
  const closeChat = useChatStore((s) => s.close);

  return (
    <Tabs
      value={layoutMode}
      onValueChange={(value) => {
        setLayoutMode(value as LayoutMode);
        closeChat();
      }}
    >
      <TabsList>
        {LAYOUT_TABS.map(({ value, icon: Icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <TabsTrigger value={value} aria-label={label} className="w-10">
                <Icon />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </TabsList>
    </Tabs>
  );
}

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
  const ThemeIcon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Fler åtgärder">
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
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
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">Ljust</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Mörkt</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => openUploadModal(courseCode)}>
            <UploadIcon />
            Ladda upp tenta/facit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <DownloadIcon />
            Ladda ned
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onSelect={() => void downloadFile(examPdfUrl, `${courseCode}_${examDate}_EXAM.pdf`)}
            >
              <FileTextIcon />
              Tenta
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!solutionPdfUrl}
              onSelect={() =>
                solutionPdfUrl &&
                void downloadFile(solutionPdfUrl, `${courseCode}_${examDate}_SOLUTION.pdf`)
              }
            >
              <BookOpenCheckIcon />
              Facit
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
