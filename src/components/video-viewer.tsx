"use client";

import { DownloadIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const SPEEDS = ["0.75", "1", "1.25", "1.5", "2"];

export function VideoViewer({
  src,
  downloadHref,
}: {
  src: string;
  downloadHref: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [speed, setSpeed] = React.useState("1");

  const changeSpeed = (value: string) => {
    if (!value) {
      return;
    }
    setSpeed(value);
    if (videoRef.current) {
      videoRef.current.playbackRate = Number.parseFloat(value);
    }
  };

  return (
    <section className="border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted-foreground">Speed</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={speed}
            onValueChange={changeSpeed}
          >
            {SPEEDS.map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="font-mono text-xs tabular-nums"
              >
                {s}x
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-1.5 font-mono text-xs"
        >
          <a href={downloadHref} download>
            <DownloadIcon className="size-3.5" strokeWidth={1.5} />
            <span>Download MP4</span>
          </a>
        </Button>
      </div>

      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
      >
        <track kind="captions" />
      </video>
    </section>
  );
}
