"use client";

import { ArrowUpRightIcon, ClockIcon, XIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DleItem, getItemById } from "@/lib/catalog";
import { clearRecentItems, readRecentRecords } from "@/lib/recent";

export function RecentStrip() {
  const [items, setItems] = React.useState<DleItem[]>([]);

  React.useEffect(() => {
    const records = readRecentRecords();
    const resolved = records
      .map((r) => getItemById(r.id))
      .filter((item): item is DleItem => Boolean(item))
      .slice(0, 4);
    setItems(resolved);
  }, []);

  if (items.length === 0) {
    return null;
  }

  const handleClear = () => {
    clearRecentItems();
    setItems([]);
  };

  return (
    <section aria-label="Continue studying" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <ClockIcon className="size-3.5" strokeWidth={1.5} />
          <span>Continue studying</span>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleClear}
          className="gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3" strokeWidth={1.5} />
          <span>Clear</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border border-border bg-card sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {items.map((item, idx) => (
          <Link
            key={item.id}
            href={`/view/${item.id}/`}
            className={`group flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-accent ${
              idx > 0 ? "sm:border-l sm:border-border" : ""
            } ${idx >= 2 ? "sm:border-t sm:border-border lg:border-t-0" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {item.moduleCode}
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {item.format}
              </Badge>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="line-clamp-2 text-sm font-medium leading-snug">
                {item.title}
              </span>
              <ArrowUpRightIcon
                className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                strokeWidth={1.5}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
