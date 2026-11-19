import catalogData from "@/data/catalog.json";

export interface ArchiveEntry {
  name: string;
  size: number;
  viewId?: string;
}

export interface DleItem {
  id: string;
  moduleCode: string;
  sectionId: string;
  sectionTitle: string;
  subgroup: string;
  title: string;
  filename: string;
  relativePath: string;
  format: string;
  viewerKind: "pdf" | "video" | "text" | "binary";
  category: "lecture" | "lab" | "video" | "assessment" | "resource";
  size: number;
  sha256: string;
  mediaKey: string;
  originalKey: string;
  converted: boolean;
  quarantined: boolean;
  archiveEntries: ArchiveEntry[];
  parentArchiveId: string | null;
  hiddenInListing: boolean;
}

export interface DleSection {
  id: string;
  dir: string;
  title: string;
  items: DleItem[];
}

export interface ExternalLink {
  group: string;
  title: string;
  url: string;
}

export interface DleModule {
  code: string;
  title: string;
  semester: string;
  dleUrl: string;
  sections: DleSection[];
  hiddenItems: DleItem[];
  externalLinks: ExternalLink[];
  stats: {
    totalItems: number;
    lectures: number;
    labs: number;
    videos: number;
    documents: number;
    totalBytes: number;
  };
}

export interface DleCatalog {
  r2Bucket: string;
  objects: Record<string, string>;
  modules: DleModule[];
}

export const catalog = catalogData as unknown as DleCatalog;

export function getModules(): DleModule[] {
  return catalog.modules;
}

export function getModuleByCode(code: string): DleModule | undefined {
  return catalog.modules.find(
    (m) => m.code.toLowerCase() === code.toLowerCase(),
  );
}

export function getAllItems(): DleItem[] {
  const items: DleItem[] = [];
  for (const mod of catalog.modules) {
    for (const sec of mod.sections) {
      items.push(...sec.items);
    }
    items.push(...mod.hiddenItems);
  }
  return items;
}

export function getVisibleItems(): DleItem[] {
  const items: DleItem[] = [];
  for (const mod of catalog.modules) {
    for (const sec of mod.sections) {
      items.push(...sec.items);
    }
  }
  return items;
}

export function getItemById(id: string): DleItem | undefined {
  return getAllItems().find((item) => item.id === id);
}

export function getAdjacentItems(item: DleItem): {
  prev: DleItem | null;
  next: DleItem | null;
} {
  const mod = getModuleByCode(item.moduleCode);
  if (!mod) {
    return { prev: null, next: null };
  }
  const flat = mod.sections.flatMap((s) => s.items);
  const idx = flat.findIndex((i) => i.id === item.id);
  if (idx === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export function mediaUrl(key: string): string {
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE || "").replace(/\/$/, "");
  return `${base}/files/${key}`;
}

export function downloadUrl(key: string, filename: string): string {
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE || "").replace(/\/$/, "");
  const params = new URLSearchParams({ download: "1", name: filename });
  return `${base}/files/${key}?${params.toString()}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
