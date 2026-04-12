import type { Metadata } from "next";
import { PT_Sans, PT_Sans_Narrow, Playfair_Display } from "next/font/google";
import "./globals.css";

const ptSans = PT_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pt-sans",
  display: "swap",
});
const ptSansNarrow = PT_Sans_Narrow({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pt-sans-narrow",
  display: "swap",
});
const playfair = Playfair_Display({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spanish Journal",
  description: "Practice Spanish, one entry at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${ptSans.variable} ${ptSansNarrow.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
