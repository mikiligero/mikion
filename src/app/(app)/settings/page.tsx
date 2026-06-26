import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { listMyShares } from "@/lib/actions/shares";
import {
  listDigestRules,
  listAmbitoOptions,
} from "@/lib/actions/digest-rules";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const prefs = await db.query.preferences.findFirst({
    where: eq(preferences.userId, session.user.id),
  });
  const shares = await listMyShares();
  const rules = await listDigestRules();
  const ambitoOptions = await listAmbitoOptions();

  return (
    <SettingsForm
      user={{ name: session.user.name, email: session.user.email }}
      shares={shares}
      rules={rules}
      ambitoOptions={ambitoOptions}
      prefs={{
        theme: prefs?.theme ?? "light",
        textScale: prefs?.textScale ?? 1,
        defaultFont: prefs?.defaultFont ?? "default",
        fullWidthDefault: prefs?.fullWidthDefault ?? false,
        language: prefs?.language ?? "es",
        startupView: prefs?.startupView ?? "home",
        telegramChatId: prefs?.telegramChatId ?? "",
      }}
    />
  );
}
