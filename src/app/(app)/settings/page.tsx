import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const prefs = await db.query.preferences.findFirst({
    where: eq(preferences.userId, session.user.id),
  });

  return (
    <SettingsForm
      user={{ name: session.user.name, email: session.user.email }}
      prefs={{
        theme: prefs?.theme ?? "light",
        textScale: prefs?.textScale ?? 1,
        defaultFont: prefs?.defaultFont ?? "default",
        fullWidthDefault: prefs?.fullWidthDefault ?? false,
        language: prefs?.language ?? "es",
        startupView: prefs?.startupView ?? "home",
      }}
    />
  );
}
