import {
  Type,
  Text,
  Hash,
  ChevronDownCircle,
  List,
  CircleDot,
  User,
  Calendar,
  CheckSquare,
  Link as LinkIcon,
  Sigma,
  ArrowLeftRight,
  Phone,
  AtSign,
  Binary,
  Clock,
  History,
  UserCircle,
  UserCog,
  MapPin,
  Link2,
} from "lucide-react";
import type { PropertyType } from "@/lib/types";

const ICONS: Record<PropertyType, React.ComponentType<{ className?: string }>> = {
  title: Type,
  text: Text,
  number: Hash,
  select: ChevronDownCircle,
  multiselect: List,
  status: CircleDot,
  person: User,
  date: Calendar,
  checkbox: CheckSquare,
  url: LinkIcon,
  phone: Phone,
  email: AtSign,
  id: Binary,
  place: MapPin,
  formula: Sigma,
  relation: ArrowLeftRight,
  page: Link2,
  createdTime: Clock,
  lastEditedTime: History,
  createdBy: UserCircle,
  lastEditedBy: UserCog,
};

export function propertyIcon(type: PropertyType) {
  const Icon = ICONS[type];
  return <Icon className="size-3.5" />;
}
