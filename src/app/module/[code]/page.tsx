import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleView } from "@/components/module-view";
import { getModuleByCode, getModules } from "@/lib/catalog";

export function generateStaticParams() {
  return getModules().map((mod) => ({ code: mod.code }));
}

export async function generateMetadata({
  params,
}: PageProps<"/module/[code]">): Promise<Metadata> {
  const { code } = await params;
  const mod = getModuleByCode(code);
  if (!mod) {
    return { title: "Module not found" };
  }
  return {
    title: `${mod.code} · ${mod.title}`,
    description: `${mod.stats.totalItems} study resources for ${mod.code} ${mod.title}.`,
  };
}

export default async function ModulePage({
  params,
}: PageProps<"/module/[code]">) {
  const { code } = await params;
  const mod = getModuleByCode(code);
  if (!mod) {
    notFound();
  }
  return <ModuleView mod={mod} />;
}
