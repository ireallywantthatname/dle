import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BinaryViewer } from "@/components/binary-viewer";
import { PdfViewer } from "@/components/pdf-viewer";
import { TextViewer } from "@/components/text-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VideoViewer } from "@/components/video-viewer";
import {
  downloadUrl,
  formatBytes,
  getAdjacentItems,
  getAllItems,
  getItemById,
  mediaUrl,
} from "@/lib/catalog";

export function generateStaticParams() {
  return getAllItems().map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/view/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = getItemById(decodeURIComponent(id));
  if (!item) {
    return { title: "Resource not found" };
  }
  return {
    title: `${item.title} · ${item.moduleCode}`,
    description: `${item.format} resource in ${item.moduleCode} ${item.sectionTitle}.`,
  };
}

export default async function ViewItemPage({
  params,
}: PageProps<"/view/[id]">) {
  const { id } = await params;
  const item = getItemById(decodeURIComponent(id));
  if (!item) {
    notFound();
  }

  const { prev, next } = getAdjacentItems(item);
  const src = mediaUrl(item.mediaKey);
  const dlHref = downloadUrl(item.originalKey, item.filename);

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-14 sm:px-8 sm:pt-7 sm:pb-16">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              asChild
              className="gap-1.5 border-input font-mono"
            >
              <Link
                href={
                  item.parentArchiveId
                    ? `/view/${item.parentArchiveId}/`
                    : `/module/${item.moduleCode}/`
                }
              >
                <ArrowLeftIcon className="size-3" strokeWidth={1.5} />
                <span>
                  {item.parentArchiveId ? "Archive" : item.moduleCode}
                </span>
              </Link>
            </Button>
            <Badge variant="outline" className="font-mono text-[10px]">
              {item.sectionTitle}
            </Badge>
            <Badge variant="default" className="font-mono text-[10px]">
              {item.format}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatBytes(item.size)}
            </span>
          </div>

          <h1 className="text-xl font-medium tracking-[-0.025em] leading-snug sm:text-2xl">
            {item.title}
          </h1>
        </div>

        <nav
          aria-label="Resource navigation"
          className="flex shrink-0 items-center gap-1.5"
        >
          {prev ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1 border-input font-mono text-xs"
            >
              <Link href={`/view/${prev.id}/`}>
                <ChevronLeftIcon className="size-3.5" strokeWidth={1.5} />
                <span>Previous</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-1 font-mono text-xs"
            >
              <ChevronLeftIcon className="size-3.5" strokeWidth={1.5} />
              <span>Previous</span>
            </Button>
          )}

          {next ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1 border-input font-mono text-xs"
            >
              <Link href={`/view/${next.id}/`}>
                <span>Next</span>
                <ChevronRightIcon className="size-3.5" strokeWidth={1.5} />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-1 font-mono text-xs"
            >
              <span>Next</span>
              <ChevronRightIcon className="size-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </nav>
      </header>

      <Separator />

      {item.viewerKind === "pdf" ? (
        <PdfViewer
          src={src}
          downloadHref={dlHref}
          originalFormat={item.format}
          converted={item.converted}
        />
      ) : null}

      {item.viewerKind === "video" ? (
        <VideoViewer src={src} downloadHref={dlHref} />
      ) : null}

      {item.viewerKind === "text" ? (
        <TextViewer src={src} downloadHref={dlHref} />
      ) : null}

      {item.viewerKind === "binary" ? <BinaryViewer item={item} /> : null}
    </article>
  );
}
