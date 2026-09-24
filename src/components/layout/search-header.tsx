import { Link } from "@tanstack/react-router";
import { AuthActions } from "@/components/auth/auth-actions";
import { HeaderCourseSearch } from "@/components/search/course-search";
import { LogoIcon } from "./logo-icon";

export function SearchHeader() {
  return (
    <header className="relative w-full bg-background pt-[env(safe-area-inset-top,0px)]">
      <div className="relative flex min-h-16 w-full flex-wrap items-center justify-between gap-y-4 px-4 py-3 md:px-10 lg:px-20 xl:flex-nowrap">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="LiU Tentor"
        >
          <LogoIcon className="size-10" />
          <span className="hidden font-logo text-xl font-medium tracking-tighter xl:inline">
            LiU Tentor
          </span>
        </Link>

        <div className="shrink-0">
          <AuthActions />
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-3xl px-4 pb-3 md:block md:px-8 lg:px-4 xl:pointer-events-none xl:absolute xl:inset-x-0 xl:top-1/2 xl:-translate-y-1/2 xl:pb-0">
        <HeaderCourseSearch className="pointer-events-auto w-full max-w-md" />
      </div>
    </header>
  );
}
