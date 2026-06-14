"use client";

import Link from "next/link";
import { ChevronRight, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import type { TreeNode } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { docIcon } from "./doc-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  nodes: TreeNode[];
  depth: number;
  activeId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onTrash: (id: string) => void;
};

export function PageTree(props: Props) {
  const { nodes } = props;
  return (
    <ul>
      {nodes.map((node) => (
        <TreeRow key={node.id} node={node} {...props} />
      ))}
    </ul>
  );
}

function TreeRow({
  node,
  depth,
  activeId,
  expanded,
  onToggle,
  onCreateChild,
  onTrash,
}: { node: TreeNode } & Props) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isActive = activeId === node.id;

  return (
    <li>
      <div
        className={cn(
          "group/row text-ink-soft hover:bg-sidebar-hover relative flex items-center gap-1 rounded-sm pr-1 text-sm transition-colors",
          isActive && "bg-sidebar-hover text-ink font-medium"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className="text-ink-faint hover:bg-line flex size-5 shrink-0 items-center justify-center rounded-sm"
          aria-label={isOpen ? "Colapsar" : "Expandir"}
          tabIndex={-1}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn("size-3.5 transition-transform", isOpen && "rotate-90")}
            />
          ) : null}
        </button>

        <Link
          href={`/p/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 py-1"
        >
          <span className="flex size-[18px] shrink-0 items-center justify-center text-[15px]">
            {docIcon(node.kind, node.emoji, isActive)}
          </span>
          <span className="truncate">{node.title || "Sin título"}</span>
        </Link>

        <div className="flex shrink-0 items-center opacity-0 group-hover/row:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-ink-faint hover:bg-line flex size-5 items-center justify-center rounded-sm"
                aria-label="Más"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem variant="destructive" onClick={() => onTrash(node.id)}>
                <Trash2 className="size-4" />
                Mover a la papelera
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => onCreateChild(node.id)}
            className="text-ink-faint hover:bg-line flex size-5 items-center justify-center rounded-sm"
            aria-label="Nueva subpágina"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <PageTree
          nodes={node.children}
          depth={depth + 1}
          activeId={activeId}
          expanded={expanded}
          onToggle={onToggle}
          onCreateChild={onCreateChild}
          onTrash={onTrash}
        />
      )}
    </li>
  );
}
