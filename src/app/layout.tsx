import { cn } from "cn";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DleShell } from "@/components/dle-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "DLE · Course Archive",
    template: "%s · DLE",
  },
  description:
    "Minimal monochrome archive for PUSL3131, PUSL3132, and PUSL3133 lectures, labs, and walkthrough videos.",
  openGraph: {
    title: "DLE · Course Archive",
    description:
      "In-browser study archive for PUSL3131, PUSL3132, and PUSL3133.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("dark font-sans", geist.variable, geistMono.variable)}
    >
      <body>
        <TooltipProvider>
          <DleShell>{children}</DleShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
