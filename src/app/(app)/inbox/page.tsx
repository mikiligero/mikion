import { requireSession } from "@/lib/session";
import { getNotifications } from "@/lib/actions/notifications";
import { InboxList } from "@/components/inbox/inbox-list";

export default async function InboxPage() {
  await requireSession();
  const items = await getNotifications();
  return <InboxList items={items} />;
}
