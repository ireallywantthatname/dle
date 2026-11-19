"use client";

import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function TextViewer({
  src,
  downloadHref,
}: {
  src: string;
  downloadHref: string;
}) {
  const [text, setText] = React.useState<string>("");
  const [filter, setFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(src)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((content) => {
        if (!cancelled) {
          setText(content);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const allLines = React.useMemo(() => text.split(/\r?\n/), [text]);
  const query = filter.trim().toLowerCase();
  const visibleLines = React.useMemo(() => {
    if (!query) {
      return allLines.map((line, i) => ({ num: i + 1, line }));
    }
    return allLines
      .map((line, i) => ({ num: i + 1, line }))
      .filter((entry) => entry.line.toLowerCase().includes(query));
  }, [allLines, query]);

  const copyAll = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative w-full max-w-xs">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter lines..."
              className="h-7 pr-7 pl-8 font-mono text-xs"
            />
            {filter ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setFilter("")}
                aria-label="Clear filter"
                className="absolute top-1/2 right-0.5 -translate-y-1/2"
              >
                <XIcon className="size-3" strokeWidth={1.5} />
              </Button>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className="shrink-0 font-mono text-[10px] tabular-nums"
          >
            {visibleLines.length} / {allLines.length} lines
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={copyAll}
            className="gap-1.5 font-mono text-xs"
          >
            {copied ? (
              <CheckIcon className="size-3.5" strokeWidth={1.5} />
            ) : (
              <CopyIcon className="size-3.5" strokeWidth={1.5} />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5 font-mono text-xs"
          >
            <a href={downloadHref} download>
              <DownloadIcon className="size-3.5" strokeWidth={1.5} />
              <span>Download</span>
            </a>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-4">
          <Alert>
            <AlertTitle>Unable to load text file</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : loading ? (
        <div className="space-y-2.5 p-5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : visibleLines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm font-medium">
            No lines match &quot;{filter}&quot;
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter("")}
            className="font-mono text-xs"
          >
            Clear filter
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[72dvh] w-full">
          <pre className="p-4 font-mono text-xs leading-relaxed">
            {visibleLines.map((entry) => (
              <div
                key={entry.num}
                className="flex gap-4 px-1 transition-colors hover:bg-accent"
              >
                <span className="w-10 shrink-0 select-none text-right text-muted-foreground tabular-nums">
                  {entry.num}
                </span>
                <span className="min-w-0 whitespace-pre-wrap break-all">
                  {entry.line || " "}
                </span>
              </div>
            ))}
          </pre>
        </ScrollArea>
      )}
    </section>
  );
}
