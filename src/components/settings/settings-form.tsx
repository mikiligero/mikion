"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ThemePref, FontPref } from "@/lib/types";
import { updatePreferences, updateAccountName } from "@/lib/actions/preferences";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Prefs = {
  theme: ThemePref;
  textScale: number;
  defaultFont: FontPref;
  fullWidthDefault: boolean;
  language: string;
  startupView: string;
};

const SCALES = [
  { value: 0.9, label: "Pequeño", size: 12 },
  { value: 1, label: "Normal", size: 15 },
  { value: 1.15, label: "Grande", size: 18 },
  { value: 1.3, label: "Enorme", size: 22 },
];

export function SettingsForm({
  user,
  prefs,
}: {
  user: { name: string; email: string };
  prefs: Prefs;
}) {
  const [section, setSection] = useState<"account" | "prefs">("account");

  return (
    <div className="mx-auto flex max-w-4xl gap-8 px-8 py-12">
      {/* Rail */}
      <nav className="w-48 shrink-0">
        <h1 className="font-serif text-ink mb-4 text-[26px] font-[560]">
          Ajustes
        </h1>
        <p className="text-ink-faint px-2 text-[11.5px] font-semibold uppercase tracking-[0.04em]">
          Cuenta
        </p>
        <RailItem
          active={section === "account"}
          onClick={() => setSection("account")}
        >
          Mi cuenta
        </RailItem>
        <RailItem active={section === "prefs"} onClick={() => setSection("prefs")}>
          Preferencias
        </RailItem>
      </nav>

      {/* Panel */}
      <div className="min-w-0 flex-1">
        {section === "account" ? (
          <AccountPanel user={user} />
        ) : (
          <PreferencesPanel prefs={prefs} />
        )}
      </div>
    </div>
  );
}

function AccountPanel({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [, startTransition] = useTransition();

  function saveName() {
    if (name.trim() && name !== user.name) {
      startTransition(() => updateAccountName(name));
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="font-serif text-ink text-[20px] font-[560]">Mi cuenta</h2>
      <div className="flex items-center gap-4">
        <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-full text-xl font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            className="max-w-xs"
          />
        </div>
      </div>

      <Row title="Correo electrónico" desc="No editable por ahora.">
        <span className="text-ink-soft text-sm">{user.email}</span>
      </Row>

      <div className="border-line border-t pt-6">
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </section>
  );
}

function PreferencesPanel({ prefs }: { prefs: Prefs }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [font, setFont] = useState<FontPref>(prefs.defaultFont);
  const [fullWidth, setFullWidth] = useState(prefs.fullWidthDefault);
  const [scale, setScale] = useState(prefs.textScale);
  const [language, setLanguage] = useState(prefs.language);
  const [startupView, setStartupView] = useState(prefs.startupView);
  // Guard de hidratación para next-themes (resolvedTheme fiable tras montar).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function applyScale(v: number) {
    setScale(v);
    document.documentElement.style.setProperty("--text-scale", String(v));
    try {
      localStorage.setItem("mikion.textScale", String(v));
    } catch {}
    void updatePreferences({ textScale: v });
  }

  return (
    <section className="space-y-1">
      <h2 className="font-serif text-ink mb-4 text-[20px] font-[560]">
        Preferencias
      </h2>

      <Row title="Apariencia" desc="Tema claro u oscuro.">
        <Segmented
          options={[
            { value: "light", label: "Claro" },
            { value: "dark", label: "Oscuro" },
          ]}
          value={mounted ? (resolvedTheme === "dark" ? "dark" : "light") : ""}
          onChange={(v) => {
            setTheme(v);
            void updatePreferences({ theme: v as ThemePref });
          }}
        />
      </Row>

      <Row title="Fuente predeterminada" desc="Fuente del contenido.">
        <Segmented
          options={[
            { value: "default", label: "Sans" },
            { value: "serif", label: "Serif" },
            { value: "mono", label: "Mono" },
          ]}
          value={font}
          onChange={(v) => {
            setFont(v as FontPref);
            const map: Record<FontPref, string> = {
              default: "var(--font-sans)",
              serif: "var(--font-serif)",
              mono: "var(--font-mono)",
            };
            document.documentElement.style.setProperty(
              "--content-font",
              map[v as FontPref]
            );
            try {
              localStorage.setItem("mikion.font", v);
            } catch {}
            void updatePreferences({ defaultFont: v as FontPref });
          }}
        />
      </Row>

      <Row title="Ancho de página completo" desc="Usa todo el ancho disponible.">
        <Switch
          checked={fullWidth}
          onCheckedChange={(c) => {
            setFullWidth(c);
            document.documentElement.classList.toggle("mikion-full-width", c);
            try {
              localStorage.setItem("mikion.fullWidth", c ? "1" : "0");
            } catch {}
            void updatePreferences({ fullWidthDefault: c });
          }}
        />
      </Row>

      <Row title="Tamaño del texto" desc="Escala el contenido (no la interfaz).">
        <div className="flex items-center gap-1">
          {SCALES.map((s) => (
            <button
              key={s.value}
              onClick={() => applyScale(s.value)}
              title={s.label}
              className={cn(
                "flex size-9 items-center justify-center rounded-md border",
                scale === s.value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-ink-soft hover:bg-sidebar-hover"
              )}
              style={{ fontSize: s.size }}
            >
              A
            </button>
          ))}
        </div>
      </Row>

      <Row title="Idioma" desc="Idioma de la interfaz.">
        <SelectControl
          value={language}
          onChange={(v) => {
            setLanguage(v);
            void updatePreferences({ language: v });
          }}
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
          ]}
        />
      </Row>

      <Row title="Abrir al iniciar" desc="Vista al entrar.">
        <SelectControl
          value={startupView}
          onChange={(v) => {
            setStartupView(v);
            void updatePreferences({ startupView: v });
          }}
          options={[
            { value: "home", label: "Inicio" },
            { value: "inbox", label: "Bandeja de entrada" },
          ]}
        />
      </Row>
    </section>
  );
}

function RailItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "mt-0.5 flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm",
        active ? "bg-sidebar-hover text-ink font-medium" : "text-ink-soft hover:bg-sidebar-hover"
      )}
    >
      {children}
    </button>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-line flex items-center justify-between gap-4 border-b py-3.5">
      <div className="min-w-0">
        <p className="text-ink text-sm font-medium">{title}</p>
        {desc && <p className="text-ink-faint text-xs">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border-line bg-sidebar inline-flex rounded-md border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] px-3 py-1 text-[13px]",
            value === o.value
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-soft"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
