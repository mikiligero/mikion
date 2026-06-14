import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// Sube una imagen (portadas de página) a public/uploads y devuelve su URL.
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo imágenes" }, { status: 415 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagen demasiado grande" }, { status: 413 });
  }

  const ext = (file.name.split(".").pop() ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  const name = `${crypto.randomUUID()}${ext ? "." + ext.toLowerCase() : ""}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` });
}
