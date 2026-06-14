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
  FunctionSquare,
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
  formula: Sigma,
  relation: ArrowLeftRight,
  rollup: FunctionSquare,
};

export function propertyIcon(type: PropertyType) {
  const Icon = ICONS[type];
  return <Icon className="size-3.5" />;
}
