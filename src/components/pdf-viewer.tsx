"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ContrastIcon,
  DownloadIcon,
  Maximize2Icon,
  Minimize2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PdfPageCanvasProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  totalPages: number;
  targetWidth: number;
  invert: boolean;
  showCaption: boolean;
  onVisible?: (page: number) => void;
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  totalPages,
  targetWidth,
  invert,
  showCaption,
  onVisible,
}: PdfPageCanvasProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [inView, setInView] = React.useState(pageNumber <= 3);
  const [dimensions, setDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [rendered, setRendered] = React.useState(false);

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (onVisible && entry.intersectionRatio >= 0.35) {
              onVisible(pageNumber);
            }
          }
        }
      },
      { rootMargin: "600px 0px", threshold: [0, 0.35, 0.6] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onVisible]);

  React.useEffect(() => {
    if (!inView || targetWidth <= 0) {
      return;
    }
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null =
      null;

    async function render() {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) {
        return;
      }
      const unscaled = page.getViewport({ scale: 1 });
      const cssScale = targetWidth / unscaled.width;
      const viewport = page.getViewport({ scale: cssScale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const renderViewport = page.getViewport({ scale: cssScale * dpr });

      setDimensions({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) {
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTask = page.render({
        canvasContext: context,
        canvas,
        viewport: renderViewport,
      });

      try {
        await renderTask.promise;
        if (!cancelled) {
          setRendered(true);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "RenderingCancelledException"
        ) {
          return;
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, targetWidth, inView]);

  const fallbackHeight = dimensions
    ? dimensions.height
    : Math.round(targetWidth * 0.75);

  return (
    <div
      ref={hostRef}
      id={`pdf-page-${pageNumber}`}
      className="flex flex-col items-center gap-2"
    >
      <div
        className="relative flex justify-center"
        style={{ minHeight: `${fallbackHeight}px` }}
      >
        {!rendered ? (
          <Skeleton
            className="border border-border"
            style={{
              width: `${Math.floor(targetWidth)}px`,
              height: `${Math.floor(fallbackHeight)}px`,
            }}
          />
        ) : null}
        <canvas
          ref={canvasRef}
          className={`block border border-border bg-white transition-opacity duration-200 ${
            rendered ? "opacity-100" : "absolute opacity-0"
          }`}
          style={invert ? { filter: "invert(1)" } : undefined}
        />
      </div>
      {showCaption ? (
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {String(pageNumber).padStart(2, "0")} /{" "}
          {String(totalPages).padStart(2, "0")}
        </span>
      ) : null}
    </div>
  );
}

export function PdfViewer({
  src,
  downloadHref,
  originalFormat,
  converted,
}: {
  src: string;
  downloadHref: string;
  originalFormat: string;
  converted: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageInput, setPageInput] = React.useState("1");
  const [zoom, setZoom] = React.useState(1);
  const [viewMode, setViewMode] = React.useState<"scroll" | "single">("scroll");
  const [invert, setInvert] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [stageWidth, setStageWidth] = React.useState(880);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) {
      return;
    }
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setStageWidth(w);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    setLoading(true);
    setError(null);
    setPdf(null);
    setNumPages(0);
    setCurrentPage(1);
    setPageInput("1");

    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({
          url: src,
          rangeChunkSize: 65536,
          disableAutoFetch: true,
          disableStream: false,
        });
        loadingTask = task;
        const doc = await task.promise;
        if (cancelled) {
          await task.destroy();
          return;
        }
        setPdf(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load document",
          );
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [src]);

  React.useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const goToPage = React.useCallback(
    (next: number) => {
      if (numPages === 0) {
        return;
      }
      const clamped = Math.max(1, Math.min(numPages, next));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      if (viewMode === "scroll") {
        const el = document.getElementById(`pdf-page-${clamped}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [numPages, viewMode],
  );

  const toggleFullscreen = React.useCallback(async () => {
    if (!containerRef.current) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }
      if (viewMode === "single") {
        if (e.key === "ArrowRight") {
          goToPage(currentPage + 1);
        } else if (e.key === "ArrowLeft") {
          goToPage(currentPage - 1);
        }
      }
      if (e.key === "=" || e.key === "+") {
        setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))));
      } else if (e.key.toLowerCase() === "i") {
        setInvert((v) => !v);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode, currentPage, goToPage, toggleFullscreen]);

  const handleVisible = React.useCallback((page: number) => {
    setCurrentPage(page);
    setPageInput(String(page));
  }, []);

  const baseWidth = Math.max(260, Math.min(stageWidth - 24, 1000));
  const targetWidth = Math.round(baseWidth * zoom);
  const progressValue =
    numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;

  return (
    <section ref={containerRef} className="border border-border bg-background">
      <div className="sticky top-14 z-10 bg-card/95 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="size-4" strokeWidth={1.5} />
            </Button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = Number.parseInt(pageInput, 10);
                if (!Number.isNaN(parsed)) {
                  goToPage(parsed);
                }
              }}
              className="flex items-center gap-1.5"
            >
              <Input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className="h-7 w-12 px-1.5 text-center font-mono text-xs tabular-nums"
                aria-label="Page number"
              />
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                / {numPages || "-"}
              </span>
            </form>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={numPages === 0 || currentPage >= numPages}
              aria-label="Next page"
            >
              <ChevronRightIcon className="size-4" strokeWidth={1.5} />
            </Button>

            <Separator
              orientation="vertical"
              className="mx-1 hidden h-4 sm:block"
            />

            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={viewMode}
              onValueChange={(v) => {
                if (v === "scroll" || v === "single") {
                  setViewMode(v);
                }
              }}
            >
              <ToggleGroupItem value="scroll" className="font-mono text-xs">
                Scroll
              </ToggleGroupItem>
              <ToggleGroupItem value="single" className="font-mono text-xs">
                Single
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))
              }
              aria-label="Zoom out"
            >
              <ZoomOutIcon className="size-3.5" strokeWidth={1.5} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(1)}
              className="font-mono text-xs tabular-nums"
            >
              {Math.round(zoom * 100)}%
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))
              }
              aria-label="Zoom in"
            >
              <ZoomInIcon className="size-3.5" strokeWidth={1.5} />
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={invert ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setInvert((v) => !v)}
                  aria-label="Invert page colors"
                >
                  <ContrastIcon className="size-3.5" strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Invert colors (I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={toggleFullscreen}
                  aria-label="Toggle fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize2Icon className="size-3.5" strokeWidth={1.5} />
                  ) : (
                    <Maximize2Icon className="size-3.5" strokeWidth={1.5} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              </TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 font-mono text-xs"
            >
              <a href={downloadHref} download>
                <DownloadIcon className="size-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">
                  {converted ? originalFormat : "Download"}
                </span>
              </a>
            </Button>
          </div>
        </div>

        <Progress value={progressValue} className="h-[2px]" />
      </div>

      {converted ? (
        <div className="flex items-center justify-between border-b border-border bg-secondary px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <span>Converted from {originalFormat} for in-browser reading</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {originalFormat}
          </Badge>
        </div>
      ) : null}

      <div
        ref={stageRef}
        className={`w-full overflow-x-auto bg-background px-3 py-6 ${
          isFullscreen ? "h-[calc(100dvh-56px)] overflow-y-auto" : ""
        }`}
      >
        {error ? (
          <Alert>
            <AlertTitle>Unable to render document</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading && !error ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-[64dvh] w-full max-w-[960px] border border-border" />
          </div>
        ) : null}

        {pdf && !error ? (
          <div className="flex flex-col items-center gap-6">
            {viewMode === "single" ? (
              <>
                <PdfPageCanvas
                  key={currentPage}
                  pdf={pdf}
                  pageNumber={currentPage}
                  totalPages={numPages}
                  targetWidth={targetWidth}
                  invert={invert}
                  showCaption={false}
                />
                <div className="flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <KbdGroup>
                      <Kbd className="border border-border bg-secondary">←</Kbd>
                      <Kbd className="border border-border bg-secondary">→</Kbd>
                    </KbdGroup>
                    <span>Page</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <KbdGroup>
                      <Kbd className="border border-border bg-secondary">-</Kbd>
                      <Kbd className="border border-border bg-secondary">+</Kbd>
                    </KbdGroup>
                    <span>Zoom</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Kbd className="border border-border bg-secondary">I</Kbd>
                    <span>Invert</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Kbd className="border border-border bg-secondary">F</Kbd>
                    <span>Fullscreen</span>
                  </div>
                </div>
              </>
            ) : (
              Array.from({ length: numPages }, (_, idx) => idx + 1).map(
                (pageNum) => (
                  <PdfPageCanvas
                    key={pageNum}
                    pdf={pdf}
                    pageNumber={pageNum}
                    totalPages={numPages}
                    targetWidth={targetWidth}
                    invert={invert}
                    showCaption
                    onVisible={handleVisible}
                  />
                ),
              )
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
