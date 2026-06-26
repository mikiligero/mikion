"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ThemePref, FontPref } from "@/lib/types";
import {
  updatePreferences,
  updateAccountName,
  testTelegram,
  sendDigestNow,
} from "@/lib/actions/preferences";
import { TIME_OPTIONS, type DigestSlot } from "@/lib/digest";
import {
  setShareRole,
  unshareDoc,
  leaveShare,
  type SharedByMe,
  type SharedWithMe,
} from "@/lib/actions/shares";
import { toast } from "sonner";
import { signOut, deleteUser } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { docIcon } from "@/components/sidebar/doc-icon";
import { LogOut, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Prefs = {
  theme: ThemePref;
  textScale: number;
  defaultFont: FontPref;
  fullWidthDefault: boolean;
  language: string;
  telegramChatId: string;
  startupView: string;
  digestMorningEnabled: boolean;
  digestMorningTime: string;
  digestMorningDays: number[];
  digestEveningEnabled: boolean;
  digestEveningTime: string;
  digestEveningDays: number[];
};

type SlotState = { enabled: boolean; time: string; days: number[] };

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const SCALES = [
  { value: 0.9, label: "Pequeño", size: 12 },
  { value: 1, label: "Normal", size: 15 },
  { value: 1.15, label: "Grande", size: 18 },
  { value: 1.3, label: "Enorme", size: 22 },
];

export function SettingsForm({
  user,
  prefs,
  shares,
}: {
  user: { name: string; email: string };
  prefs: Prefs;
  shares: { byMe: SharedByMe[]; withMe: SharedWithMe[] };
}) {
  const [section, setSection] = useState<"account" | "prefs" | "shares">(
    "account"
  );

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
        <RailItem
          active={section === "shares"}
          onClick={() => setSection("shares")}
        >
          Compartido
        </RailItem>
      </nav>

      {/* Panel */}
      <div className="min-w-0 flex-1">
        {section === "account" ? (
          <AccountPanel user={user} />
        ) : section === "prefs" ? (
          <PreferencesPanel prefs={prefs} />
        ) : (
          <SharesPanel shares={shares} />
        )}
      </div>
    </div>
  );
}

function SharesPanel({
  shares,
}: {
  shares: { byMe: SharedByMe[]; withMe: SharedWithMe[] };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [byMe, setByMe] = useState(shares.byMe);
  const [withMe, setWithMe] = useState(shares.withMe);

  function changeRole(
    docId: string,
    userId: string,
    role: "viewer" | "editor"
  ) {
    setByMe((cur) =>
      cur.map((d) =>
        d.docId === docId
          ? {
              ...d,
              collaborators: d.collaborators.map((c) =>
                c.userId === userId ? { ...c, role } : c
              ),
            }
          : d
      )
    );
    startTransition(async () => {
      await setShareRole(docId, userId, role);
    });
  }

  function revoke(docId: string, userId: string) {
    setByMe((cur) =>
      cur
        .map((d) =>
          d.docId === docId
            ? {
                ...d,
                collaborators: d.collaborators.filter(
                  (c) => c.userId !== userId
                ),
              }
            : d
        )
        .filter((d) => d.collaborators.length > 0)
    );
    startTransition(async () => {
      await unshareDoc(docId, userId);
      router.refresh();
    });
  }

  function leave(docId: string) {
    setWithMe((cur) => cur.filter((d) => d.docId !== docId));
    startTransition(async () => {
      await leaveShare(docId);
      router.refresh();
    });
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-serif text-ink text-[20px] font-[560]">
          Compartido por mí
        </h2>
        <p className="text-ink-faint mt-1 text-sm">
          Páginas y bases de datos que has compartido con otras personas.
        </p>
        {byMe.length === 0 ? (
          <p className="text-ink-faint mt-4 text-sm">
            No has compartido nada todavía.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {byMe.map((d) => (
              <div key={d.docId} className="border-line rounded-lg border p-3">
                <Link
                  href={`/p/${d.docId}`}
                  className="text-ink hover:text-brand flex items-center gap-2 text-sm font-medium"
                >
                  <span className="flex size-[18px] items-center justify-center text-[15px]">
                    {docIcon(d.kind, d.emoji)}
                  </span>
                  <span className="truncate">{d.title || "Sin título"}</span>
                </Link>
                <div className="mt-3 space-y-2">
                  {d.collaborators.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink truncate">{c.name}</p>
                        <p className="text-ink-faint truncate text-xs">
                          {c.email}
                        </p>
                      </div>
                      <Select
                        value={c.role}
                        onValueChange={(v) =>
                          changeRole(d.docId, c.userId, v as "viewer" | "editor")
                        }
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Lector</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => revoke(d.docId, c.userId)}
                        aria-label="Quitar acceso"
                        title="Quitar acceso"
                        className="text-ink-faint hover:bg-sidebar-hover flex size-8 shrink-0 items-center justify-center rounded-md hover:text-red-600"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-line border-t pt-6">
        <h2 className="font-serif text-ink text-[20px] font-[560]">
          Compartido conmigo
        </h2>
        <p className="text-ink-faint mt-1 text-sm">
          Lo que otras personas han compartido contigo.
        </p>
        {withMe.length === 0 ? (
          <p className="text-ink-faint mt-4 text-sm">
            Nadie ha compartido nada contigo.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {withMe.map((d) => (
              <div
                key={d.docId}
                className="border-line flex items-center gap-2 rounded-lg border p-3 text-sm"
              >
                <Link
                  href={`/p/${d.docId}`}
                  className="text-ink hover:text-brand flex min-w-0 flex-1 items-center gap-2 font-medium"
                >
                  <span className="flex size-[18px] items-center justify-center text-[15px]">
                    {docIcon(d.kind, d.emoji)}
                  </span>
                  <span className="truncate">{d.title || "Sin título"}</span>
                </Link>
                <span className="text-ink-faint shrink-0 text-xs">
                  {d.ownerName} · {d.role === "editor" ? "Editor" : "Lector"}
                </span>
                <button
                  onClick={() => leave(d.docId)}
                  className="text-ink-faint hover:bg-sidebar-hover flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs hover:text-red-600"
                >
                  <LogOut className="size-3.5" /> Salir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AccountPanel({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  function saveName() {
    if (name.trim() && name !== user.name) {
      startTransition(() => updateAccountName(name));
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const { error } = await deleteUser({ password });
    setDeleting(false);
    if (error) {
      toast.error(error.message ?? "No se pudo eliminar la cuenta");
      return;
    }
    router.push("/login");
    router.refresh();
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

      <div className="border-line flex items-center gap-3 border-t pt-6">
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

        <AlertDialog
          onOpenChange={(open) => {
            if (!open) setPassword("");
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-red-600 hover:text-red-600">
              Eliminar cuenta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción borra tu cuenta y todo su contenido (páginas, bases
                de datos, comentarios). No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="delete-password">Confirma tu contraseña</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!password || deleting}
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-600/90"
              >
                {deleting ? "Eliminando…" : "Eliminar definitivamente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  const [telegram, setTelegram] = useState(prefs.telegramChatId);
  const [testing, setTesting] = useState(false);
  const [morning, setMorning] = useState<SlotState>({
    enabled: prefs.digestMorningEnabled,
    time: prefs.digestMorningTime,
    days: prefs.digestMorningDays,
  });
  const [evening, setEvening] = useState<SlotState>({
    enabled: prefs.digestEveningEnabled,
    time: prefs.digestEveningTime,
    days: prefs.digestEveningDays,
  });
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

      <div className="border-line border-b py-3.5">
        <p className="text-ink text-sm font-medium">Notificaciones por Telegram</p>
        <p className="text-ink-faint text-xs">
          Recibe tus notificaciones en Telegram. Pega tu <strong>chat_id</strong>{" "}
          (escribe a{" "}
          <span className="text-ink-soft">@userinfobot</span> en Telegram para
          obtenerlo) y pulsa Probar.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            onBlur={() => void updatePreferences({ telegramChatId: telegram.trim() || null })}
            placeholder="p. ej. 123456789"
            className="max-w-xs"
          />
          <Button
            variant="outline"
            disabled={testing || !telegram.trim()}
            onClick={async () => {
              setTesting(true);
              await updatePreferences({ telegramChatId: telegram.trim() || null });
              const res = await testTelegram(telegram);
              setTesting(false);
              if (res.ok) toast.success("Mensaje de prueba enviado ✅");
              else toast.error(res.error ?? "No se pudo enviar");
            }}
          >
            {testing ? "Enviando…" : "Probar"}
          </Button>
        </div>
      </div>

      <div className="py-3.5">
        <p className="text-ink text-sm font-medium">Resúmenes de tareas</p>
        <p className="text-ink-faint text-xs">
          Avisos con tus tareas pendientes (las filas de tus bases de datos con
          fecha, sin completar) a la bandeja y a Telegram. Elige hora y días de
          cada resumen. Zona horaria: Europe/Madrid.
        </p>
        <div className="mt-3 space-y-2">
          <DigestSlotCard
            slot="morning"
            title="☀️ Resumen de la mañana"
            hint="Tareas con fecha de hoy"
            value={morning}
            onChange={(patch) => {
              const next = { ...morning, ...patch };
              setMorning(next);
              void updatePreferences({
                digestMorningEnabled: next.enabled,
                digestMorningTime: next.time,
                digestMorningDays: next.days,
              });
            }}
          />
          <DigestSlotCard
            slot="evening"
            title="🌙 Resumen de la tarde"
            hint="Mañana + resto de la semana"
            value={evening}
            onChange={(patch) => {
              const next = { ...evening, ...patch };
              setEvening(next);
              void updatePreferences({
                digestEveningEnabled: next.enabled,
                digestEveningTime: next.time,
                digestEveningDays: next.days,
              });
            }}
          />
        </div>
      </div>
    </section>
  );
}

function DigestSlotCard({
  slot,
  title,
  hint,
  value,
  onChange,
}: {
  slot: DigestSlot;
  title: string;
  hint: string;
  value: SlotState;
  onChange: (patch: Partial<SlotState>) => void;
}) {
  const [sending, setSending] = useState(false);

  function toggleDay(d: number) {
    const days = value.days.includes(d)
      ? value.days.filter((x) => x !== d)
      : [...value.days, d].sort((a, b) => a - b);
    onChange({ days });
  }

  return (
    <div className="border-line rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-sm font-medium">{title}</p>
          <p className="text-ink-faint text-xs">{hint}</p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
        />
      </div>

      {value.enabled && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select value={value.time} onValueChange={(time) => onChange({ time })}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {DAY_LABELS.map((label, d) => {
              const on = value.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md border text-xs font-medium",
                    on
                      ? "border-brand bg-brand text-white"
                      : "border-line text-ink-soft hover:bg-sidebar-hover"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              const { total } = await sendDigestNow(slot);
              setSending(false);
              toast.success(
                total > 0
                  ? `Resumen enviado (${total} ${total === 1 ? "tarea" : "tareas"}) ✅`
                  : "No tienes tareas en esa ventana"
              );
            }}
          >
            {sending ? "Enviando…" : "Enviar ahora"}
          </Button>
        </div>
      )}
    </div>
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
