import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Tipografía Mikion (self-host vía next/font): serif para títulos/citas,
// sans para UI/cuerpo, mono para código.
const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const sans = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // `default` para rutas sin título propio; `template` antepone el nombre del
  // doc/BD abierto en la pestaña del navegador (lo aporta cada generateMetadata).
  title: { default: "Mikion", template: "%s · Mikion" },
  description: "Tu espacio de trabajo personal, estilo Notion",
};

// Aplica preferencias de contenido (tamaño de texto, fuente, ancho completo)
// desde localStorage antes del primer paint, para que no parpadeen. El tema lo
// gestiona next-themes. Ver guía preventing-flash-before-hydration.
const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;
var s=localStorage.getItem("mikion.textScale");if(s)d.style.setProperty("--text-scale",s);
var f=localStorage.getItem("mikion.font");if(f==="serif")d.style.setProperty("--content-font","var(--font-serif)");else if(f==="mono")d.style.setProperty("--content-font","var(--font-mono)");
if(localStorage.getItem("mikion.fullWidth")==="1")d.classList.add("mikion-full-width");
}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
