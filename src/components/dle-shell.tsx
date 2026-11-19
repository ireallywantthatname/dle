"use client";

import {
  ArchiveIcon,
  BookOpenIcon,
  FileTextIcon,
  FilmIcon,
  FolderIcon,
  HomeIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  type DleItem,
  getItemById,
  getModuleByCode,
  getModules,
} from "@/lib/catalog";
import { recordRecentItem } from "@/lib/recent";

function itemIcon(viewerKind: DleItem["viewerKind"]) {
  if (viewerKind === "video") {
    return <FilmIcon className="size-3.5 shrink-0" strokeWidth={1.5} />;
  }
  if (viewerKind === "binary") {
    return <ArchiveIcon className="size-3.5 shrink-0" strokeWidth={1.5} />;
  }
  return <FileTextIcon className="size-3.5 shrink-0" strokeWidth={1.5} />;
}

function SidebarNavContent({
  activeModuleCode,
  activeSectionId,
}: {
  activeModuleCode: string | null;
  activeSectionId: string | null;
}) {
  const modules = getModules();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const activeModule = activeModuleCode
    ? getModuleByCode(activeModuleCode)
    : undefined;

  return (
    <>
      <SidebarHeader className="border-b border-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/"}
              tooltip="Course archive"
              onClick={() => setOpenMobile(false)}
            >
              <Link href="/">
                <HomeIcon className="size-4" strokeWidth={1.5} />
                <span className="font-mono text-xs font-semibold tracking-[0.14em] uppercase">
                  DLE
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[11px] tracking-wider text-muted-foreground">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((mod) => {
                const isActive =
                  activeModuleCode?.toLowerCase() === mod.code.toLowerCase();
                return (
                  <SidebarMenuItem key={mod.code}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={`${mod.code} · ${mod.title}`}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Link href={`/module/${mod.code}/`}>
                        <BookOpenIcon
                          className="size-4 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="truncate font-mono text-xs">
                          {mod.code}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="font-mono text-[10px] tabular-nums">
                      {mod.stats.totalItems}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeModule ? (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[11px] tracking-wider text-muted-foreground">
              {activeModule.code} sections
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeModule.sections.map((sec) => (
                  <SidebarMenuItem key={sec.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeSectionId === sec.id}
                      tooltip={sec.title}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Link href={`/module/${activeModule.code}/#${sec.id}`}>
                        <FolderIcon
                          className="size-3.5 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="truncate text-xs">{sec.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="font-mono text-[10px] tabular-nums">
                      {sec.items.length}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 group-data-[collapsible=icon]:hidden">
        <div className="font-mono text-[11px] text-muted-foreground">
          26/001/SEM1 · 3 modules
        </div>
      </SidebarFooter>
      <SidebarRail />
    </>
  );
}

export function DleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isViewerRoute = pathname.startsWith("/view/");
  const [sidebarOpen, setSidebarOpen] = React.useState(!isViewerRoute);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const segments = pathname.split("/").filter(Boolean);
  let activeModuleCode: string | null = null;
  let activeItem: DleItem | undefined;

  if (segments[0] === "module" && segments[1]) {
    activeModuleCode = segments[1].toUpperCase();
  } else if (segments[0] === "view" && segments[1]) {
    activeItem = getItemById(decodeURIComponent(segments[1]));
    if (activeItem) {
      activeModuleCode = activeItem.moduleCode;
    }
  }

  const activeModule = activeModuleCode
    ? getModuleByCode(activeModuleCode)
    : undefined;
  const modules = getModules();

  React.useEffect(() => {
    setSidebarOpen(!isViewerRoute);
  }, [isViewerRoute]);

  React.useEffect(() => {
    if (activeItem) {
      recordRecentItem(activeItem.id);
    }
  }, [activeItem]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Button
        asChild
        size="sm"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 font-mono text-xs"
      >
        <a href="#main-content">Skip to content</a>
      </Button>

      <Sidebar collapsible="icon">
        <SidebarNavContent
          activeModuleCode={activeModuleCode}
          activeSectionId={activeItem?.sectionId ?? null}
        />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem>
                  {activeModule ? (
                    <BreadcrumbLink asChild>
                      <Link
                        href="/"
                        className="font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        DLE
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="font-mono text-xs tracking-wider">
                      DLE
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>

                {activeModule ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {activeItem ? (
                        <BreadcrumbLink asChild>
                          <Link
                            href={`/module/${activeModule.code}/`}
                            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {activeModule.code}
                          </Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="font-mono text-xs">
                          {activeModule.code}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </>
                ) : null}

                {activeItem ? (
                  <>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem className="hidden min-w-0 sm:block">
                      <BreadcrumbPage className="max-w-[260px] truncate text-xs md:max-w-[440px]">
                        {activeItem.title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="gap-2.5 border-input font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <SearchIcon className="size-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Search archive</span>
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd className="border border-border bg-secondary font-mono text-[10px]">
                Ctrl
              </Kbd>
              <Kbd className="border border-border bg-secondary font-mono text-[10px]">
                K
              </Kbd>
            </KbdGroup>
          </Button>
        </header>

        <main id="main-content" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search archive"
        description="Search modules, lectures, labs, and videos"
      >
        <Command>
          <CommandInput placeholder="Search lectures, labs, videos, files..." />
          <CommandList>
            <CommandEmpty>No matching files found.</CommandEmpty>
            {modules.map((mod) => (
              <CommandGroup
                key={mod.code}
                heading={`${mod.code} · ${mod.title}`}
              >
                {mod.sections.flatMap((sec) =>
                  sec.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${mod.code} ${sec.title} ${item.title} ${item.filename} ${item.format}`}
                      onSelect={() => {
                        setSearchOpen(false);
                        router.push(`/view/${item.id}/`);
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {itemIcon(item.viewerKind)}
                        <span className="truncate text-xs">{item.title}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                          {sec.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {item.format}
                        </Badge>
                      </div>
                    </CommandItem>
                  )),
                )}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </SidebarProvider>
  );
}
