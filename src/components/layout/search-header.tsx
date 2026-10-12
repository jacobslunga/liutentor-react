import { Link } from "@tanstack/react-router";
import { HeaderCourseSearch } from "@/components/search/course-search";
import { HeaderActions } from "./header-actions";
import { Logo } from "./logo";

export function SearchHeader() {
  return (
    <header className="relative z-40 w-full bg-background pt-[env(safe-area-inset-top,0px)]">
      <div className="container mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 py-3 md:gap-6 md:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="LiU Tentor"
        >
          <Logo
            iconClassName="size-10"
            textClassName="hidden text-xl xl:inline"
          />
        </Link>

        <HeaderCourseSearch className="hidden max-w-sm md:block" />

        <HeaderActions className="ml-auto" />
      </div>
    </header>
  );
}
