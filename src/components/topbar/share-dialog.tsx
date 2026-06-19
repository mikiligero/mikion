"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  listShares,
  listShareableUsers,
  shareDoc,
  setShareRole,
  unshareDoc,
  type Collaborator,
  type ShareableUser,
} from "@/lib/actions/shares";

const ROLE_LABEL = { viewer: "Lector", editor: "Editor" } as const;

export function ShareDialog({ docId }: { docId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [myRole, setMyRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [candidates, setCandidates] = useState<ShareableUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const data = await listShares(docId);
    setIsOwner(data.isOwner);
    setMyRole(data.myRole);
    setCollaborators(data.collaborators);
    if (data.isOwner) {
      const users = await listShareableUsers(docId);
      setCandidates(users);
      setSelectedUser((cur) =>
        users.some((u) => u.id === cur) ? cur : users[0]?.id ?? ""
      );
    }
    setLoaded(true);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLoaded(false);
      void refresh();
    }
  }

  function invite() {
    if (!selectedUser) return;
    startTransition(async () => {
      try {
        await shareDoc(docId, selectedUser, role);
        await refresh();
        router.refresh();
        toast.success("Invitación enviada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo compartir");
      }
    });
  }

  function changeRole(userId: string, next: "viewer" | "editor") {
    startTransition(async () => {
      await setShareRole(docId, userId, next);
      await refresh();
      router.refresh();
    });
  }

  function remove(userId: string) {
    startTransition(async () => {
      await unshareDoc(docId, userId);
      await refresh();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="text-brand hover:bg-brand-tint ml-1 flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] font-medium">
          <Users className="size-4" /> Compartir
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Invita a otras personas a esta página y su contenido."
              : `Tienes acceso como ${ROLE_LABEL[myRole === "owner" ? "editor" : myRole]}.`}
          </DialogDescription>
        </DialogHeader>

        {isOwner &&
          (candidates.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="min-w-0 flex-1">
                  <SelectValue placeholder="Elige una persona" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex flex-col">
                        <span className="text-sm">{u.name}</span>
                        <span className="text-ink-faint text-xs">{u.email}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "viewer" | "editor")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Lector</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={invite}
                disabled={pending || !selectedUser}
                className="bg-brand text-primary-foreground hover:bg-brand/90 flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Invitar"
                )}
              </button>
            </div>
          ) : (
            loaded && (
              <p className="text-ink-faint text-sm">
                No hay más personas con las que compartir.
              </p>
            )
          ))}

        <div className="mt-1 space-y-1">
          {!loaded ? (
            <p className="text-ink-faint py-2 text-sm">Cargando…</p>
          ) : collaborators.length === 0 ? (
            <p className="text-ink-faint py-2 text-sm">
              Aún no has compartido esta página.
            </p>
          ) : (
            collaborators.map((c) => (
              <div key={c.userId} className="flex items-center gap-2 py-1">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="text-xs">
                    {c.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-ink truncate text-sm font-medium">
                    {c.name}
                  </div>
                  <div className="text-ink-faint truncate text-xs">{c.email}</div>
                </div>
                {isOwner ? (
                  <>
                    <Select
                      value={c.role}
                      onValueChange={(v) =>
                        changeRole(c.userId, v as "viewer" | "editor")
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Lector</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => remove(c.userId)}
                      aria-label="Quitar acceso"
                      className="text-ink-faint hover:bg-sidebar-hover hover:text-red-600 flex size-8 items-center justify-center rounded-sm"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-ink-faint text-xs">
                    {ROLE_LABEL[c.role]}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
