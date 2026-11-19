import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { RecentStrip } from "@/components/recent-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, getModules } from "@/lib/catalog";

export default function HomePage() {
  const modules = getModules();
  const totalItems = modules.reduce((acc, m) => acc + m.stats.totalItems, 0);
  const totalDocs = modules.reduce((acc, m) => acc + m.stats.documents, 0);
  const totalVideos = modules.reduce((acc, m) => acc + m.stats.videos, 0);
  const totalBytes = modules.reduce((acc, m) => acc + m.stats.totalBytes, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-20">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span>26/001/SEM1</span>
          <span>/</span>
          <span className="tabular-nums">{modules.length} modules</span>
          <span>/</span>
          <span className="tabular-nums">{totalItems} items</span>
          <span>/</span>
          <span className="tabular-nums">{formatBytes(totalBytes)}</span>
        </div>

        <h1 className="text-4xl font-semibold tracking-[-0.04em] leading-[1.02] sm:text-5xl">
          Course archive
        </h1>

        <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
          All {totalDocs} lecture slides, lab sheets, and {totalVideos}{" "}
          walkthrough videos open directly in the browser with no sign-in
          required.
        </p>
      </header>

      <RecentStrip />

      <section
        aria-label="Modules"
        className="flex flex-col divide-y divide-border border-y border-border"
      >
        {modules.map((mod, idx) => {
          const ordinal = String(idx + 1).padStart(2, "0");
          const quickSections = mod.sections.slice(0, 5);
          return (
            <article
              key={mod.code}
              className="group grid grid-cols-1 items-start gap-6 py-8 transition-colors hover:bg-card sm:py-10 lg:grid-cols-12 lg:items-center lg:px-4"
            >
              <div className="flex items-baseline gap-4 lg:col-span-2 lg:flex-col lg:gap-2">
                <span className="font-mono text-3xl font-light tracking-tight text-muted-foreground tabular-nums sm:text-4xl">
                  {ordinal}
                </span>
                <Badge
                  variant="default"
                  className="font-mono text-xs tracking-wider"
                >
                  {mod.code}
                </Badge>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-5">
                <Link
                  href={`/module/${mod.code}/`}
                  className="text-xl font-medium tracking-[-0.025em] leading-snug transition-colors group-hover:underline group-hover:underline-offset-4 sm:text-2xl"
                >
                  {mod.title}
                </Link>
                <div className="flex flex-wrap items-center gap-1">
                  {quickSections.map((sec) => (
                    <Button
                      key={sec.id}
                      variant="ghost"
                      size="xs"
                      asChild
                      className="h-6 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/module/${mod.code}/#${sec.id}`}>
                        {sec.title}
                      </Link>
                    </Button>
                  ))}
                  {mod.sections.length > quickSections.length ? (
                    <span className="px-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                      +{mod.sections.length - quickSections.length}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 border-t border-border pt-4 font-mono lg:col-span-3 lg:border-t-0 lg:pt-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Docs
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {mod.stats.documents}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Labs
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {mod.stats.labs}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Videos
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {mod.stats.videos}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Size
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatBytes(mod.stats.totalBytes)}
                  </span>
                </div>
              </div>

              <div className="flex lg:col-span-2 lg:justify-end">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-between gap-2 border-input font-mono text-xs transition-colors group-hover:border-foreground group-hover:bg-primary group-hover:text-primary-foreground lg:w-auto"
                >
                  <Link href={`/module/${mod.code}/`}>
                    <span>Open</span>
                    <ArrowUpRightIcon
                      className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.5}
                    />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
