"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, users } from "@/db/schema";
import type { ThemePref, FontPref } from "@/lib/types";
import { requireUserId } from "./helpers";

export async function updatePreferences(
  patch: Partial<{
    theme: ThemePref;
    textScale: number;
    defaultFont: FontPref;
    fullWidthDefault: boolean;
    language: string;
    startupView: string;
  }>
) {
  const userId = await requireUserId();
  await db
    .update(preferences)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(preferences.userId, userId));
}

export async function updateAccountName(name: string) {
  if (!name.trim()) return;
  const userId = await requireUserId();
  await db
    .update(users)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/", "layout");
}
