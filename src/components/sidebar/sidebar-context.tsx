"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
  // Drawer en móvil (<768px): independiente del colapso de escritorio, que
  // se oculta por completo vía CSS y no debe controlar la visibilidad móvil.
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  toggleMobile: () => {},
  closeMobile: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (localStorage.getItem("mikion.sidebarCollapsed") === "1")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
  }, []);

  // Cierra el drawer móvil al navegar a otra página.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMobileOpen(false), [pathname]);

  // Atajo ⌘\ para alternar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem("mikion.sidebarCollapsed", next ? "1" : "0");
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("mikion.sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggle, mobileOpen, toggleMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
