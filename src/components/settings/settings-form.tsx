"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ThemePref, FontPref } from "@/lib/types";
import {
  updatePreferences,
  updateAccountName,
  testTelegram,
} from "@/lib/actions/preferences";
import { TIME_OPTIONS, BUCKETS } from "@/lib/digest";
import { STATUS_GROUPS, PRIORITY_GROUPS } from "@/lib/types";
import {
  createDigestRule,
  updateDigestRule,
  deleteDigestRule,
  sendDigestRuleNow,
  type DigestRuleDTO,
} from "@/lib/actions/digest-rules";
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
import { LogOut, X, Plus, Trash2, Send } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Prefs = {
  theme: ThemePref;
  textScale: number;
  defaultFont: FontPref;
  fullWidthDefault: boolean;
  language: string;
  telegramChatId: string;
  startupView: string;
};

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
  rules,
  ambitoOptions,
}: {
  user: { name: string; email: string };
  prefs: Prefs;
  shares: { byMe: SharedByMe[]; withMe: SharedWithMe[] };
  rules: DigestRuleDTO[];
  ambitoOptions: string[];
}) {
  const [section, setSection] = useState<
    "account" | "prefs" | "notifications" | "shares"
  >("account");

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
          active={section === "notifications"}
          onClick={() => setSection("notifications")}
        >
          Notificaciones
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
        ) : section === "notifications" ? (
          <NotificationsPanel
            prefs={prefs}
            rules={rules}
            ambitoOptions={ambitoOptions}
          />
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

function TelegramHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-brand hover:underline text-xs">
          ¿Cómo configurarlo?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Telegram</DialogTitle>
        </DialogHeader>
        <ol className="text-ink-soft space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="bg-brand text-paper flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              1
            </span>
            <span>
              Abre{" "}
              <strong className="text-ink">@Mikion_bot</strong> en Telegram y
              pulsa <strong className="text-ink">Start</strong>. Este paso es
              obligatorio: el bot no puede escribirte si tú no le has escrito
              primero.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand text-paper flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              2
            </span>
            <span>
              Abre{" "}
              <a
                href="https://t.me/UserInfoBot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                @UserInfoBot
              </a>{" "}
              en Telegram y pulsa <strong className="text-ink">Start</strong>.
              Te responderá con tu <strong className="text-ink">Id</strong> (un
              número, p. ej.{" "}
              <code className="bg-sidebar-hover rounded px-1 text-xs">
                243615018
              </code>
              ).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand text-paper flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              3
            </span>
            <span>
              Pega ese número en el campo de abajo y pulsa{" "}
              <strong className="text-ink">Probar</strong>. Si todo está bien
              recibirás un mensaje de confirmación en Telegram.
            </span>
          </li>
        </ol>
        <p className="text-ink-faint mt-2 text-xs">
          Cada usuario de Mikion configura su propio chat_id. Todos comparten el
          mismo bot (@Mikion_bot).
        </p>
      </DialogContent>
    </Dialog>
  );
}

function NotificationsPanel({
  prefs,
  rules: initialRules,
  ambitoOptions,
}: {
  prefs: Prefs;
  rules: DigestRuleDTO[];
  ambitoOptions: string[];
}) {
  const [telegram, setTelegram] = useState(prefs.telegramChatId);
  const [testing, setTesting] = useState(false);
  const [rules, setRules] = useState<DigestRuleDTO[]>(initialRules);

  function patchRule(id: string, patch: Partial<DigestRuleDTO>) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    void updateDigestRule(id, patch);
  }

  async function addRule() {
    const created = await createDigestRule();
    setRules((rs) => [...rs, created]);
  }

  function removeRule(id: string) {
    setRules((rs) => rs.filter((r) => r.id !== id));
    void deleteDigestRule(id);
  }

  return (
    <section className="space-y-1">
      <h2 className="font-serif text-ink mb-4 text-[20px] font-[560]">
        Notificaciones
      </h2>

      <div className="border-line border-b py-3.5">
        <p className="text-ink text-sm font-medium">Notificaciones por Telegram</p>
        <p className="text-ink-faint text-xs">
          Recibe tus notificaciones en Telegram. Introduce tu{" "}
          <strong>chat_id</strong> y pulsa Probar.{" "}
          <TelegramHelpDialog />
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
        <p className="text-ink text-sm font-medium">Avisos de tareas</p>
        <p className="text-ink-faint text-xs">
          Crea avisos a medida: elige la hora, los días, qué incluir (retrasados,
          hoy, mañana, próximos 10 días) y filtra por estado y prioridad. Llegan a
          la bandeja y a Telegram. Zona horaria: Europe/Madrid.
        </p>

        {rules.length === 0 ? (
          <p className="text-ink-faint mt-4 text-sm">
            No tienes ningún aviso. Añade el primero.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {rules.map((r) => (
              <RuleCard
                key={r.id}
                rule={r}
                ambitoOptions={ambitoOptions}
                onChange={(patch) => patchRule(r.id, patch)}
                onDelete={() => removeRule(r.id)}
              />
            ))}
          </div>
        )}

        <button
          onClick={addRule}
          className="text-ink-soft hover:bg-sidebar-hover mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
        >
          <Plus className="size-4" /> Añadir aviso
        </button>
      </div>
    </section>
  );
}

/** Botones tipo «chip» multiselección (días, tramos, grupos). */
function ChipToggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-medium",
        on
          ? "border-brand bg-brand text-white"
          : "border-line text-ink-soft hover:bg-sidebar-hover"
      )}
    >
      {children}
    </button>
  );
}

function RuleCard({
  rule,
  ambitoOptions,
  onChange,
  onDelete,
}: {
  rule: DigestRuleDTO;
  ambitoOptions: string[];
  onChange: (patch: Partial<DigestRuleDTO>) => void;
  onDelete: () => void;
}) {
  const [sending, setSending] = useState(false);

  function toggleIn(key: "days", value: number): void;
  function toggleIn(
    key: "buckets" | "statusGroups" | "priorityGroups" | "ambitos",
    value: string
  ): void;
  function toggleIn(
    key: "days" | "buckets" | "statusGroups" | "priorityGroups" | "ambitos",
    value: number | string
  ) {
    const list = rule[key] as (number | string)[];
    const next = list.includes(value)
      ? list.filter((x) => x !== value)
      : [...list, value];
    onChange({ [key]: next } as Partial<DigestRuleDTO>);
  }

  return (
    <div className="border-line rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <Select value={rule.time} onValueChange={(time) => onChange({ time })}>
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
        <div className="flex items-center gap-1">
          <Switch
            checked={rule.enabled}
            onCheckedChange={(enabled) => onChange({ enabled })}
          />
          <button
            onClick={onDelete}
            aria-label="Eliminar aviso"
            title="Eliminar aviso"
            className="text-ink-faint hover:bg-sidebar-hover flex size-8 items-center justify-center rounded-md hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <p className="text-ink-faint mb-1 text-[11px] font-medium uppercase tracking-[0.04em]">
            Días
          </p>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, d) => (
              <ChipToggle
                key={d}
                on={rule.days.includes(d)}
                onClick={() => toggleIn("days", d)}
              >
                {label}
              </ChipToggle>
            ))}
          </div>
        </div>

        <div>
          <p className="text-ink-faint mb-1 text-[11px] font-medium uppercase tracking-[0.04em]">
            Qué incluir
          </p>
          <div className="flex flex-wrap gap-1">
            {BUCKETS.map((b) => (
              <ChipToggle
                key={b.value}
                on={rule.buckets.includes(b.value)}
                onClick={() => toggleIn("buckets", b.value)}
              >
                {b.label}
              </ChipToggle>
            ))}
          </div>
        </div>

        <div>
          <p className="text-ink-faint mb-1 text-[11px] font-medium uppercase tracking-[0.04em]">
            Estado
          </p>
          <div className="flex flex-wrap gap-1">
            {STATUS_GROUPS.map((g) => (
              <ChipToggle
                key={g.value}
                on={rule.statusGroups.includes(g.value)}
                onClick={() => toggleIn("statusGroups", g.value)}
              >
                {g.label}
              </ChipToggle>
            ))}
          </div>
        </div>

        <div>
          <p className="text-ink-faint mb-1 text-[11px] font-medium uppercase tracking-[0.04em]">
            Prioridad <span className="lowercase">(vacío = todas)</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_GROUPS.map((g) => (
              <ChipToggle
                key={g.value}
                on={rule.priorityGroups.includes(g.value)}
                onClick={() => toggleIn("priorityGroups", g.value)}
              >
                {g.label}
              </ChipToggle>
            ))}
          </div>
        </div>

        {ambitoOptions.length > 0 && (
          <div>
            <p className="text-ink-faint mb-1 text-[11px] font-medium uppercase tracking-[0.04em]">
              Ámbito <span className="lowercase">(vacío = todos)</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {ambitoOptions.map((name) => (
                <ChipToggle
                  key={name}
                  on={rule.ambitos.includes(name)}
                  onClick={() => toggleIn("ambitos", name)}
                >
                  {name}
                </ChipToggle>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-ink-faint mb-1 text-[11px] font-medium uppercase tracking-[0.04em]">
            Más antiguas
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={rule.oldestCount > 0}
              onCheckedChange={(on) => onChange({ oldestCount: on ? 5 : 0 })}
            />
            {rule.oldestCount > 0 ? (
              <span className="text-ink-soft flex items-center gap-1.5">
                Añadir las
                <Select
                  value={String(rule.oldestCount)}
                  onValueChange={(v) => onChange({ oldestCount: Number(v) })}
                >
                  <SelectTrigger className="h-7 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 3, 5, 10, 15].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                tareas más antiguas
              </span>
            ) : (
              <span className="text-ink-faint">
                Añadir las tareas más antiguas (aunque queden fuera de los tramos)
              </span>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            const { total } = await sendDigestRuleNow(rule.id);
            setSending(false);
            toast.success(
              total > 0
                ? `Enviado (${total} ${total === 1 ? "tarea" : "tareas"}) ✅`
                : "Sin tareas que avisar ahora"
            );
          }}
        >
          <Send className="size-3.5" /> {sending ? "Enviando…" : "Enviar ahora"}
        </Button>
      </div>
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
