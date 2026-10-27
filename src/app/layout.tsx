import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { TableLabels } from "@/components/TableLabels";
import { BottomNav } from "@/components/BottomNav";
import { UiEnhancer } from "@/components/UiEnhancer";

const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Graphite Renovation";
export const metadata: Metadata = { title: { default: name, template: `%s — ${name}` }, description: "Ремонт квартир: расчёт стоимости, заявки, смета и фотоотчёты онлайн.", manifest: "/manifest.webmanifest", icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" }, appleWebApp: { capable: true, title: "Graphite", statusBarStyle: "black-translucent" } };
export const viewport: Viewport = { themeColor: "#0B0C0C", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ru"><body><Header />{children}<BottomNav /><TableLabels /><Suspense fallback={null}><UiEnhancer /></Suspense></body></html>);
}
