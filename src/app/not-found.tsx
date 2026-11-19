import { ArrowLeftIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getModules } from "@/lib/catalog";

export default function NotFound() {
  const modules = getModules();

  return (
    <section className="mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <Badge
          variant="outline"
          className="w-fit font-mono text-xs tracking-widest"
        >
          404
        </Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Resource not found
        </h1>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          The page or file path does not exist in the current catalog. Return to
          the module index or open one of the three modules directly.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" className="gap-2 font-mono text-xs">
          <Link href="/">
            <ArrowLeftIcon className="size-3.5" strokeWidth={1.5} />
            <span>Back to modules</span>
          </Link>
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col divide-y divide-border border-y border-border">
        {modules.map((mod) => (
          <Link
            key={mod.code}
            href={`/module/${mod.code}/`}
            className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-accent px-2"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {mod.code}
              </span>
              <span className="text-sm font-medium">{mod.title}</span>
            </div>
            <ArrowUpRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              strokeWidth={1.5}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
