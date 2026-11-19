export {};

const media = Bun.spawn(["bun", "scripts/media-dev.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});

const next = Bun.spawn(["bun", "--bun", "next", "dev"], {
  env: {
    ...process.env,
    NEXT_PUBLIC_MEDIA_BASE: "http://localhost:3001",
  },
  stdout: "inherit",
  stderr: "inherit",
});

function shutdown() {
  media.kill();
  next.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const code = await next.exited;
media.kill();
process.exit(code);
