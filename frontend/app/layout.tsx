import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "ClimateSafe Route — Walk NYC the cooler way",
  description:
    "Pedestrian navigation that routes you around urban heat islands and flood zones — not just the shortest path.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable} ${fraunces.variable}`}>
      <body className="bg-slate-950 text-slate-50 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
