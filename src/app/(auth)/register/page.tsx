"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1, "Introduce tu nombre"),
  email: z.string().email("Correo no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Igual que en login: evita el envío nativo (GET con credenciales en la URL)
  // antes de que React hidrate, inhabilitando el botón hasta montar.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp.email(parsed.data);
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "No se pudo crear la cuenta");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-[560]">
          Crea tu cuenta
        </CardTitle>
        <CardDescription>Tu espacio de trabajo personal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="post" onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Tu nombre"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !mounted}
            className="mt-1 w-full"
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
        <p className="text-ink-faint mt-4 text-center text-sm">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-brand font-medium">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
