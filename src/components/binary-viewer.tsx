import { AlertTriangleIcon, DownloadIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type DleItem, downloadUrl, formatBytes } from "@/lib/catalog";

export function BinaryViewer({ item }: { item: DleItem }) {
  const href = downloadUrl(item.originalKey, item.filename);

  return (
    <section className="flex flex-col gap-6">
      {item.quarantined ? (
        <Alert>
          <AlertTriangleIcon className="size-4" strokeWidth={1.5} />
          <AlertTitle>Lab malware sample archive</AlertTitle>
          <AlertDescription>
            DLE flags this archive as containing malicious lab files for Snort
            exercises. Only extract it inside an isolated lab virtual machine.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-mono text-sm font-medium">{item.filename}</h2>
            <p className="max-w-[60ch] text-xs text-muted-foreground">
              Binary lab artifact. Download to inspect in Wireshark, Autopsy,
              Snort, or your lab VM.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5 font-mono text-xs">
            <a href={href} download>
              <DownloadIcon className="size-3.5" strokeWidth={1.5} />
              <span>Download ({formatBytes(item.size)})</span>
            </a>
          </Button>
        </div>

        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="w-36 font-mono text-xs text-muted-foreground">
                Format
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {item.format}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs text-muted-foreground">
                Size
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatBytes(item.size)} · {item.size.toLocaleString()} bytes
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs text-muted-foreground">
                Path
              </TableCell>
              <TableCell className="font-mono text-xs">
                {item.relativePath}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs text-muted-foreground">
                SHA-256
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                {item.sha256}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {item.archiveEntries.length > 0 ? (
        <div className="border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <h3 className="text-sm font-medium">Archive contents</h3>
            <Badge
              variant="outline"
              className="font-mono text-[10px] tabular-nums"
            >
              {item.archiveEntries.length} files
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[11px] text-muted-foreground">
                  Entry
                </TableHead>
                <TableHead className="w-28 text-right font-mono text-[11px] text-muted-foreground">
                  Size
                </TableHead>
                <TableHead className="w-28 text-right font-mono text-[11px] text-muted-foreground">
                  View
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.archiveEntries.map((entry) => (
                <TableRow key={entry.name}>
                  <TableCell className="font-mono text-xs">
                    {entry.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatBytes(entry.size)}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.viewId ? (
                      <Button
                        variant="outline"
                        size="xs"
                        asChild
                        className="gap-1 font-mono"
                      >
                        <Link href={`/view/${entry.viewId}/`}>
                          <EyeIcon className="size-3" strokeWidth={1.5} />
                          <span>Open</span>
                        </Link>
                      </Button>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        -
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}
