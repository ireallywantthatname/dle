import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "src", "data", "catalog.json");
const FILES_DIR = path.join(ROOT, ".dle-media", "files");
const STATE_PATH = path.join(ROOT, ".r2-state.json");

interface CatalogFile {
  r2Bucket: string;
  objects: Record<string, string>;
}

const catalog = JSON.parse(
  fs.readFileSync(CATALOG_PATH, "utf-8"),
) as CatalogFile;
const bucket = catalog.r2Bucket;

let state: Record<string, number> = {};
if (fs.existsSync(STATE_PATH)) {
  state = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
}

const listProc = Bun.spawnSync(
  ["bun", "--bun", "wrangler", "r2", "bucket", "list"],
  {
    stdout: "pipe",
    stderr: "pipe",
  },
);
const bucketExists =
  listProc.stdout.toString().includes(`name:           ${bucket}`) ||
  listProc.stdout.toString().includes(`name: ${bucket}`);

if (!bucketExists) {
  console.log(`Creating R2 bucket ${bucket}...`);
  const createProc = Bun.spawnSync(
    ["bun", "--bun", "wrangler", "r2", "bucket", "create", bucket],
    {
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  if (createProc.exitCode !== 0) {
    process.exit(createProc.exitCode);
  }
}

const entries = Object.entries(catalog.objects);
const pending: Array<[string, string, string, number]> = [];

for (const [key, contentType] of entries) {
  const filePath = path.join(FILES_DIR, key);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing staged file: ${filePath}`);
    process.exit(1);
  }
  const size = fs.statSync(filePath).size;
  if (state[key] === size) {
    continue;
  }
  pending.push([key, contentType, filePath, size]);
}

console.log(
  `R2 sync: ${pending.length} to upload, ${entries.length - pending.length} already synced`,
);

const CONCURRENCY = 4;
let index = 0;
let uploaded = 0;
let failed = 0;

function saveState() {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

async function worker() {
  while (index < pending.length) {
    const current = pending[index++];
    const [key, contentType, filePath, size] = current;
    const proc = Bun.spawn(
      [
        "bun",
        "--bun",
        "wrangler",
        "r2",
        "object",
        "put",
        `${bucket}/${key}`,
        "--file",
        filePath,
        "--content-type",
        contentType,
        "--remote",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const code = await proc.exited;
    if (code === 0) {
      state[key] = size;
      uploaded++;
      saveState();
      console.log(
        `[${uploaded}/${pending.length}] uploaded ${key} (${(size / 1048576).toFixed(2)} MB)`,
      );
    } else {
      failed++;
      const errText = await new Response(proc.stderr).text();
      console.error(`FAILED ${key}: ${errText.trim()}`);
    }
  }
}

await Promise.all(
  Array.from(
    { length: Math.min(CONCURRENCY, Math.max(1, pending.length)) },
    () => worker(),
  ),
);

if (failed > 0) {
  console.error(`R2 upload finished with ${failed} failure(s)`);
  process.exit(1);
}

console.log(
  `R2 sync complete: ${uploaded} uploaded, ${entries.length} total objects in ${bucket}`,
);
