"use client";

import {
  ArchiveIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FilmIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DleItem, type DleModule, formatBytes } from "@/lib/catalog";

function kindIcon(kind: DleItem["viewerKind"]) {
  if (kind === "video") {
    return (
      <FilmIcon
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
    );
  }
  if (kind === "binary") {
    return (
      <ArchiveIcon
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
    );
  }
  return (
    <FileTextIcon
      className="size-4 shrink-0 text-muted-foreground"
      strokeWidth={1.5}
    />
  );
}

export function ModuleView({ mod }: { mod: DleModule }) {
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState("all");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  const matchesItem = (item: DleItem) => {
    if (tab === "lectures" && item.category !== "lecture") {
      return false;
    }
    if (tab === "labs" && item.category !== "lab") {
      return false;
    }
    if (tab === "videos" && item.viewerKind !== "video") {
      return false;
    }
    if (tab === "assessments" && item.category !== "assessment") {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      item.title.toLowerCase().includes(q) ||
      item.filename.toLowerCase().includes(q) ||
      item.sectionTitle.toLowerCase().includes(q) ||
      item.subgroup.toLowerCase().includes(q) ||
      item.format.toLowerCase().includes(q)
    );
  };

  const filteredSections = mod.sections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter(matchesItem),
    }))
    .filter((sec) => sec.items.length > 0);

  const filteredLinks = mod.externalLinks.filter((link) => {
    if (!q) {
      return true;
    }
    return (
      link.title.toLowerCase().includes(q) ||
      link.group.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q)
    );
  });

  const toggleSection = (id: string, open: boolean) => {
    setCollapsed((prev) => ({ ...prev, [id]: !open }));
  };

  const clearFilters = () => {
    setQuery("");
    setTab("all");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-8 pb-16 sm:px-8 sm:pt-10 sm:pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="default"
              className="font-mono text-xs tracking-wider"
            >
              {mod.code}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {mod.semester}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] leading-[1.08] sm:text-4xl">
            {mod.title}
          </h1>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {mod.stats.totalItems} items · {mod.stats.documents} documents ·{" "}
            {mod.stats.labs} labs · {mod.stats.videos} videos ·{" "}
            {formatBytes(mod.stats.totalBytes)}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-1.5 border-input font-mono text-xs"
        >
          <a href={mod.dleUrl} target="_blank" rel="noreferrer">
            <span>Original DLE</span>
            <ExternalLinkIcon className="size-3.5" strokeWidth={1.5} />
          </a>
        </Button>
      </header>

      <Separator />

      <Tabs value={tab} onValueChange={setTab} className="w-full gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="all" className="font-mono text-xs tabular-nums">
              All ({mod.stats.totalItems})
            </TabsTrigger>
            <TabsTrigger
              value="lectures"
              className="font-mono text-xs tabular-nums"
            >
              Lectures ({mod.stats.lectures})
            </TabsTrigger>
            <TabsTrigger
              value="labs"
              className="font-mono text-xs tabular-nums"
            >
              Labs ({mod.stats.labs})
            </TabsTrigger>
            {mod.stats.videos > 0 ? (
              <TabsTrigger
                value="videos"
                className="font-mono text-xs tabular-nums"
              >
                Videos ({mod.stats.videos})
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="assessments" className="font-mono text-xs">
              Assessment
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="font-mono text-xs tabular-nums"
            >
              Links ({mod.externalLinks.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter files..."
              className="h-8 pr-8 pl-8 font-mono text-xs"
            />
            {query ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                <XIcon className="size-3" strokeWidth={1.5} />
              </Button>
            ) : null}
          </div>
        </div>

        {tab !== "links" ? (
          <TabsContent value={tab} className="mt-0 flex flex-col">
            {filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 border border-border bg-card py-16 text-center">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">No matching resources</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Try another keyword or reset the active tab filter.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="font-mono text-xs"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="hidden grid-cols-12 items-center border-b border-border px-3 pb-2 font-mono text-[11px] tracking-wider text-muted-foreground sm:grid">
                  <span className="col-span-8">Resource</span>
                  <span className="col-span-2">Format</span>
                  <span className="col-span-2 text-right">Size</span>
                </div>

                <div className="flex flex-col divide-y divide-border border-b border-border">
                  {filteredSections.map((sec) => {
                    const isOpen = !collapsed[sec.id];
                    return (
                      <Collapsible
                        key={sec.id}
                        id={sec.id}
                        open={isOpen}
                        onOpenChange={(open) => toggleSection(sec.id, open)}
                        className="scroll-mt-20"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="flex h-auto w-full items-center justify-between bg-card px-3 py-3 text-left hover:bg-accent"
                          >
                            <div className="flex items-center gap-2.5">
                              <ChevronDownIcon
                                className={`size-4 text-muted-foreground transition-transform duration-200 ${
                                  isOpen ? "rotate-0" : "-rotate-90"
                                }`}
                                strokeWidth={1.5}
                              />
                              <span className="text-sm font-medium tracking-[-0.01em]">
                                {sec.title}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] tabular-nums"
                            >
                              {sec.items.length}
                            </Badge>
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="flex flex-col divide-y divide-border/70 border-t border-border">
                            {sec.items.map((item) => (
                              <Link
                                key={item.id}
                                href={`/view/${item.id}/`}
                                className="group grid grid-cols-12 items-center gap-2 px-3 py-3 transition-colors hover:bg-accent"
                              >
                                <div className="col-span-10 flex min-w-0 items-center gap-3 sm:col-span-8">
                                  {kindIcon(item.viewerKind)}
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-normal group-hover:text-foreground">
                                      {item.title}
                                    </div>
                                    {item.subgroup ? (
                                      <div className="font-mono text-[11px] text-muted-foreground">
                                        {item.subgroup}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="col-span-2 flex justify-end sm:justify-start">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px]"
                                  >
                                    {item.format}
                                  </Badge>
                                </div>

                                <div className="hidden items-center justify-end gap-2 font-mono text-xs text-muted-foreground tabular-nums sm:col-span-2 sm:flex">
                                  <span>{formatBytes(item.size)}</span>
                                  <ArrowUpRightIcon
                                    className="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground group-hover:opacity-100"
                                    strokeWidth={1.5}
                                  />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        ) : (
          <TabsContent value="links" className="mt-0">
            {filteredLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 border border-border bg-card py-16 text-center">
                <p className="text-sm font-medium">
                  No matching external links
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery("")}
                  className="font-mono text-xs"
                >
                  Clear filter
                </Button>
              </div>
            ) : (
              <div className="border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-card">
                      <TableHead className="font-mono text-[11px] text-muted-foreground">
                        Category
                      </TableHead>
                      <TableHead className="font-mono text-[11px] text-muted-foreground">
                        Link
                      </TableHead>
                      <TableHead className="w-24 text-right font-mono text-[11px] text-muted-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link) => (
                      <TableRow key={`${link.group}-${link.url}`}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {link.group}
                        </TableCell>
                        <TableCell className="text-sm">{link.title}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="xs"
                            asChild
                            className="gap-1 font-mono"
                          >
                            <a href={link.url} target="_blank" rel="noreferrer">
                              <span>Open</span>
                              <ExternalLinkIcon
                                className="size-3"
                                strokeWidth={1.5}
                              />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
