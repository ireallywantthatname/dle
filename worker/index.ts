interface Env {
  ASSETS: Fetcher;
  DLE_BUCKET: R2Bucket;
}

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".rules": "text/plain; charset=utf-8",
  ".lua": "text/plain; charset=utf-8",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".pcap": "application/vnd.tcpdump.pcap",
  ".dd": "application/octet-stream",
};

function guessContentType(key: string): string {
  const lower = key.toLowerCase();
  for (const [ext, mime] of Object.entries(MIME_BY_EXT)) {
    if (lower.endsWith(ext)) {
      return mime;
    }
  }
  return "application/octet-stream";
}

function safeDownloadName(raw: string): string {
  return raw.replace(/[\r\n"\\]/g, "_").trim() || "download";
}

function resolveRange(
  range: R2Range | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!range) {
    return null;
  }
  if ("suffix" in range && typeof range.suffix === "number") {
    const start = Math.max(0, size - range.suffix);
    return { start, end: Math.max(start, size - 1) };
  }
  const offset =
    "offset" in range && typeof range.offset === "number" ? range.offset : 0;
  const length =
    "length" in range && typeof range.length === "number"
      ? range.length
      : size - offset;
  if (offset >= size || length <= 0) {
    return null;
  }
  return { start: offset, end: Math.min(size - 1, offset + length - 1) };
}

const worker: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/files/")) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    let key: string;
    try {
      key = decodeURIComponent(url.pathname.slice("/files/".length));
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (!key || key.includes("..")) {
      return new Response("Bad Request", { status: 400 });
    }

    const download = url.searchParams.get("download") === "1";
    const downloadName =
      url.searchParams.get("name") || key.split("/").pop() || "file";
    const disposition = download
      ? `attachment; filename="${safeDownloadName(downloadName)}"`
      : `inline; filename="${safeDownloadName(downloadName)}"`;

    if (request.method === "HEAD") {
      const head = await env.DLE_BUCKET.head(key);
      if (!head) {
        return new Response("Not Found", { status: 404 });
      }
      const headers = new Headers();
      head.writeHttpMetadata(headers);
      if (!headers.has("content-type")) {
        headers.set("content-type", guessContentType(key));
      }
      headers.set("content-length", String(head.size));
      headers.set("accept-ranges", "bytes");
      headers.set("etag", head.httpEtag);
      headers.set("content-disposition", disposition);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(null, { status: 200, headers });
    }

    const rangeHeader = request.headers.get("range");
    const object = await env.DLE_BUCKET.get(
      key,
      rangeHeader ? { range: request.headers } : undefined,
    );

    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", guessContentType(key));
    }
    headers.set("accept-ranges", "bytes");
    headers.set("etag", object.httpEtag);
    headers.set("content-disposition", disposition);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    if (rangeHeader && object.range) {
      const resolved = resolveRange(object.range, object.size);
      if (!resolved) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "content-range": `bytes */${object.size}` },
        });
      }
      const length = resolved.end - resolved.start + 1;
      headers.set(
        "content-range",
        `bytes ${resolved.start}-${resolved.end}/${object.size}`,
      );
      headers.set("content-length", String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  },
};

export default worker;
