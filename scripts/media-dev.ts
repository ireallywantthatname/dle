import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILES_DIR = path.join(ROOT, ".dle-media", "files");
const CATALOG_PATH = path.join(ROOT, "src", "data", "catalog.json");
const PORT = Number(process.env.MEDIA_PORT || 3001);

function loadMimeMap(): Record<string, string> {
  if (!fs.existsSync(CATALOG_PATH)) {
    return {};
  }
  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
  return raw.objects || {};
}

const server = Bun.serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url);
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Expose-Headers":
        "Accept-Ranges, Content-Range, Content-Length, Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!url.pathname.startsWith("/files/")) {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    const key = decodeURIComponent(url.pathname.slice("/files/".length));
    if (!key || key.includes("..")) {
      return new Response("Bad Request", { status: 400, headers: corsHeaders });
    }

    const filePath = path.join(FILES_DIR, key);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    const mimeMap = loadMimeMap();
    const contentType = mimeMap[key] || "application/octet-stream";
    const size = fs.statSync(filePath).size;
    const download = url.searchParams.get("download") === "1";
    const name = (
      url.searchParams.get("name") || path.basename(filePath)
    ).replace(/[\r\n"\\]/g, "_");
    const disposition = download
      ? `attachment; filename="${name}"`
      : `inline; filename="${name}"`;

    const baseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=3600",
    };

    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { ...baseHeaders, "Content-Length": String(size) },
      });
    }

    const rangeHeader = request.headers.get("range");
    const bunFile = Bun.file(filePath);

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { ...corsHeaders, "Content-Range": `bytes */${size}` },
        });
      }
      let start = match[1] ? Number.parseInt(match[1], 10) : 0;
      let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
      if (!match[1] && match[2]) {
        start = Math.max(0, size - Number.parseInt(match[2], 10));
        end = size - 1;
      }
      if (start >= size || end < start) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { ...corsHeaders, "Content-Range": `bytes */${size}` },
        });
      }
      end = Math.min(end, size - 1);
      const slice = bunFile.slice(start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }

    return new Response(bunFile, {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(size) },
    });
  },
});

console.log(`Media server listening on http://localhost:${server.port}`);
