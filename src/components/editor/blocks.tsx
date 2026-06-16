"use client";

import { useReducer } from "react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  filterSuggestionItems,
  type BlockNoteEditor,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  useBlockNoteEditor,
  useEditorChange,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import {
  Lightbulb,
  ListTree,
  Globe,
  Sigma,
  Calendar,
  Table2,
  Columns2,
  Columns3,
  FileText,
} from "lucide-react";
import { createInlineDatabase } from "@/lib/actions/databases";
import { createSubPage } from "@/lib/actions/docs";
import { EmojiPickerPopover } from "./emoji-picker";
import { Embed } from "./embed-block";
import { Equation } from "./equation-block";
import { InlineDatabase } from "./inline-db-block";
import { Mention, DateChip, PageLink } from "./inline-content";

// --- Llamada (callout) ----------------------------------------------------
const Callout = createReactBlockSpec(
  { type: "callout", propSchema: { emoji: { default: "💡" } }, content: "inline" },
  {
    render: ({ block, contentRef, editor }) => (
      <div className="bg-brand-tint border-line my-1 flex w-full gap-2.5 rounded-md border px-3 py-2.5">
        <EmojiPickerPopover
          onSelect={(emoji) =>
            editor.updateBlock(block, { props: { emoji } })
          }
          trigger={
            <button
              className="shrink-0 text-lg leading-none"
              contentEditable={false}
            >
              {block.props.emoji}
            </button>
          }
        />
        <div className="min-w-0 flex-1" ref={contentRef} />
      </div>
    ),
  }
);

// --- Tabla de contenidos --------------------------------------------------
function inlineText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((n) =>
      n && typeof n === "object" && "text" in n ? String((n as { text: string }).text) : ""
    )
    .join("");
}

function TocContent() {
  const editor = useBlockNoteEditor();
  const [, force] = useReducer((x) => x + 1, 0);
  useEditorChange(() => force(), editor);

  const headings = editor.document.filter(
    (b) => b.type === "heading"
  ) as { id: string; props: { level: number }; content: unknown }[];

  if (headings.length === 0) {
    return (
      <p className="text-ink-faint my-1 text-sm" contentEditable={false}>
        Tabla de contenidos (añade encabezados)
      </p>
    );
  }

  return (
    <nav className="border-line my-1 border-l-2 py-0.5" contentEditable={false}>
      {headings.map((h) => (
        <button
          key={h.id}
          onClick={() => {
            document
              .querySelector(`[data-id="${h.id}"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="text-ink-soft hover:text-brand block w-full truncate py-0.5 text-left text-sm"
          style={{ paddingLeft: `${(h.props.level - 1) * 14 + 10}px` }}
        >
          {inlineText(h.content) || "Sin título"}
        </button>
      ))}
    </nav>
  );
}

const TableOfContents = createReactBlockSpec(
  { type: "toc", propSchema: {}, content: "none" },
  { render: () => <TocContent /> }
);

// --- Schema ---------------------------------------------------------------
export const schema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      callout: Callout(),
      toc: TableOfContents(),
      embed: Embed(),
      equation: Equation(),
      inlineDatabase: InlineDatabase(),
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      mention: Mention,
      date: DateChip,
      pageLink: PageLink,
    },
  })
);

// Items del menú "@" para mencionar usuarios.
export function getMentionItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  users: { id: string; name: string }[]
): DefaultReactSuggestionItem[] {
  return users.map((u) => ({
    title: u.name,
    onItemClick: () =>
      editor.insertInlineContent([
        { type: "mention", props: { userId: u.id, name: u.name } },
        " ",
      ]),
  }));
}

// Inserta un bloque: reemplaza el párrafo vacío actual o inserta debajo.
function insertBlock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  type: string,
  props?: Record<string, unknown>
) {
  const cur = editor.getTextCursorPosition().block;
  const empty =
    !cur.content || (Array.isArray(cur.content) && cur.content.length === 0);
  const block = props ? { type, props } : { type };
  if (cur.type === "paragraph" && empty) editor.updateBlock(cur, block);
  else editor.insertBlocks([block], cur, "after");
}

// Inserta un bloque de N columnas. No usamos `updateBlock` para convertir el
// párrafo actual: @blocknote/core rompe esa rama (blockContainer → bnBlock)
// y deja `setTextCursorPosition` apuntando a un id que ya no existe (ver
// getDefaultSlashMenuItems.ts / updateBlock.ts upstream). En su lugar
// insertamos el bloque nuevo y, si el párrafo de partida estaba vacío, lo
// eliminamos después — así nunca se reutiliza una referencia obsoleta.
function insertColumns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  count: 2 | 3
) {
  // No se pueden anidar columnas dentro de una columna: si el cursor ya está
  // dentro de un column/columnList, insertamos tras ese bloque de nivel
  // superior en vez de tras el párrafo (que rompería con "Invalid content
  // for node column").
  let cur = editor.getTextCursorPosition().block;
  let nested = false;
  for (
    let parent = editor.getParentBlock(cur);
    parent;
    parent = editor.getParentBlock(cur)
  ) {
    cur = parent;
    nested = true;
  }
  // Solo se reemplaza si el bloque de nivel superior es, él mismo, un
  // párrafo vacío — nunca un contenedor (columnList) al que se llegó subiendo
  // por anidamiento, o se borraría contenido real.
  const empty =
    !nested &&
    cur.type === "paragraph" &&
    (!cur.content || (Array.isArray(cur.content) && cur.content.length === 0));
  const columnList = {
    type: "columnList",
    children: Array.from({ length: count }, () => ({
      type: "column",
      children: [{ type: "paragraph" }],
    })),
  };
  const [inserted] = editor.insertBlocks([columnList], cur, "after");
  if (empty) editor.removeBlocks([cur]);
  const firstParagraph = inserted.children?.[0]?.children?.[0];
  if (firstParagraph) editor.setTextCursorPosition(firstParagraph, "start");
}

// --- Slash menu (español, defaults + custom) ------------------------------
export async function getSlashItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  query: string,
  pageDocId?: string,
  navigate?: (href: string) => void
): Promise<DefaultReactSuggestionItem[]> {
  const custom: DefaultReactSuggestionItem[] = [
    {
      title: "Dos Columnas",
      subtext: "Dos columnas lado a lado",
      aliases: ["columnas", "fila", "dividir", "dos"],
      group: "Bloques básicos",
      icon: <Columns2 className="size-4" />,
      onItemClick: () => insertColumns(editor, 2),
    },
    {
      title: "Tres Columnas",
      subtext: "Tres columnas lado a lado",
      aliases: ["columnas", "fila", "dividir", "tres"],
      group: "Bloques básicos",
      icon: <Columns3 className="size-4" />,
      onItemClick: () => insertColumns(editor, 3),
    },
    {
      title: "Llamada",
      subtext: "Resaltar información en un recuadro",
      aliases: ["callout", "llamada", "aviso", "nota", "info"],
      group: "Avanzado",
      icon: <Lightbulb className="size-4" />,
      onItemClick: () => insertBlock(editor, "callout"),
    },
    {
      title: "Tabla de contenidos",
      subtext: "Índice de los encabezados de la página",
      aliases: ["toc", "indice", "índice", "contenidos"],
      group: "Avanzado",
      icon: <ListTree className="size-4" />,
      onItemClick: () => insertBlock(editor, "toc"),
    },
    {
      title: "Insertar / Embed",
      subtext: "YouTube, Spotify, Maps, Figma, Loom o un marcador web",
      aliases: ["embed", "insertar", "youtube", "spotify", "mapa", "maps", "figma", "loom", "vimeo", "marcador", "bookmark", "enlace"],
      group: "Multimedia",
      icon: <Globe className="size-4" />,
      onItemClick: () => insertBlock(editor, "embed"),
    },
    {
      title: "Ecuación",
      subtext: "Fórmula matemática con LaTeX (KaTeX)",
      aliases: ["ecuacion", "ecuación", "latex", "katex", "formula", "fórmula", "math"],
      group: "Avanzado",
      icon: <Sigma className="size-4" />,
      onItemClick: () => insertBlock(editor, "equation"),
    },
    {
      title: "Fecha",
      subtext: "Insertar una fecha en línea",
      aliases: ["fecha", "date", "hoy"],
      group: "Avanzado",
      icon: <Calendar className="size-4" />,
      onItemClick: () =>
        editor.insertInlineContent([
          { type: "date", props: { date: new Date().toISOString().slice(0, 10) } },
          " ",
        ]),
    },
  ];

  // Subpágina + enlace: solo en páginas (necesita el doc padre para anidarla).
  if (pageDocId) {
    custom.push({
      title: "Página",
      subtext: "Crear una subpágina y enlazarla aquí",
      aliases: ["pagina", "página", "page", "subpagina", "subpágina"],
      group: "Básico",
      icon: <FileText className="size-4" />,
      onItemClick: async () => {
        const { id, title, emoji } = await createSubPage(pageDocId);
        editor.insertInlineContent([
          { type: "pageLink", props: { docId: id, title: title ?? "", emoji: emoji ?? "" } },
          " ",
        ]);
        // Abre la nueva página para editarla directamente.
        navigate?.(`/p/${id}`);
      },
    });
    custom.push({
      title: "Base de datos en línea",
      subtext: "Incrusta una base de datos dentro de la página",
      aliases: ["bd", "base de datos", "database", "tabla", "inline"],
      group: "Bases de datos",
      icon: <Table2 className="size-4" />,
      onItemClick: async () => {
        const { databaseId } = await createInlineDatabase(pageDocId);
        insertBlock(editor, "inlineDatabase", { databaseId });
      },
    });
  }
  // Reagrupa de forma estable para que cada grupo sea contiguo (si no, dos
  // grupos "Avanzado" no contiguos provocan claves duplicadas en el menú).
  const all = [...getDefaultReactSlashMenuItems(editor), ...custom];
  const order: (string | undefined)[] = [];
  const byGroup = new Map<string | undefined, DefaultReactSuggestionItem[]>();
  for (const item of all) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, []);
      order.push(item.group);
    }
    byGroup.get(item.group)!.push(item);
  }
  const merged = order.flatMap((g) => byGroup.get(g)!);
  return filterSuggestionItems(merged, query);
}
