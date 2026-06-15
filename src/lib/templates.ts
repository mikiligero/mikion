import type { Block } from "@/lib/types";

// Constructores de bloques (formato BlockNote) para plantillas.
const txt = (text: string) => [{ type: "text", text, styles: {} }];
const h = (level: 1 | 2 | 3, text: string): Block => ({
  type: "heading",
  props: { level },
  content: txt(text),
});
const p = (text = ""): Block => ({
  type: "paragraph",
  content: text ? txt(text) : [],
});
const todo = (text: string, checked = false): Block => ({
  type: "checkListItem",
  props: { checked },
  content: txt(text),
});
const bullet = (text: string): Block => ({
  type: "bulletListItem",
  content: txt(text),
});
const num = (text: string): Block => ({
  type: "numberedListItem",
  content: txt(text),
});
const quote = (text: string): Block => ({ type: "quote", content: txt(text) });
const callout = (emoji: string, text: string): Block => ({
  type: "callout",
  props: { emoji },
  content: txt(text),
});

export type TemplateCategory = "Básico" | "Trabajo" | "Personal";

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  emoji: string;
  description: string;
  build: () => { title: string; emoji: string; blocks: Block[] };
};

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Página en blanco",
    category: "Básico",
    emoji: "📄",
    description: "Empieza desde cero.",
    build: () => ({ title: "", emoji: "📄", blocks: [p()] }),
  },
  {
    id: "meeting",
    name: "Notas de reunión",
    category: "Trabajo",
    emoji: "📝",
    description: "Asistentes, temas y acciones.",
    build: () => ({
      title: "Notas de reunión",
      emoji: "📝",
      blocks: [
        callout("📌", "Reunión del equipo. Completa antes de empezar."),
        h(2, "Asistentes"),
        bullet("…"),
        h(2, "Temas tratados"),
        bullet("…"),
        h(2, "Decisiones"),
        bullet("…"),
        h(2, "Acciones"),
        todo("Tarea 1"),
        todo("Tarea 2"),
      ],
    }),
  },
  {
    id: "prd",
    name: "PRD",
    category: "Trabajo",
    emoji: "📐",
    description: "Documento de requisitos de producto.",
    build: () => ({
      title: "PRD · ",
      emoji: "📐",
      blocks: [
        callout("🎯", "Resumen en una frase del problema y la solución."),
        h(1, "Contexto"),
        p("¿Por qué hacemos esto ahora?"),
        h(1, "Objetivos"),
        bullet("Objetivo principal"),
        h(1, "Requisitos"),
        num("Requisito funcional 1"),
        num("Requisito funcional 2"),
        h(1, "Fuera de alcance"),
        bullet("…"),
        h(1, "Métricas de éxito"),
        bullet("…"),
      ],
    }),
  },
  {
    id: "wiki",
    name: "Wiki de equipo",
    category: "Trabajo",
    emoji: "📚",
    description: "Documentación interna.",
    build: () => ({
      title: "Wiki",
      emoji: "📚",
      blocks: [
        p("Bienvenida a la wiki del equipo."),
        h(2, "Cómo trabajamos"),
        bullet("…"),
        h(2, "Enlaces útiles"),
        bullet("…"),
        h(2, "Preguntas frecuentes"),
        quote("Pregunta → respuesta."),
      ],
    }),
  },
  {
    id: "weekly",
    name: "Planificador semanal",
    category: "Personal",
    emoji: "🗓️",
    description: "Tareas por día.",
    build: () => ({
      title: "Semana",
      emoji: "🗓️",
      blocks: [
        ...["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].flatMap(
          (d): Block[] => [h(3, d), todo("…"), todo("…")]
        ),
      ],
    }),
  },
  {
    id: "reading",
    name: "Lista de lecturas",
    category: "Personal",
    emoji: "📖",
    description: "Libros y artículos por leer.",
    build: () => ({
      title: "Lista de lecturas",
      emoji: "📖",
      blocks: [
        h(2, "Por leer"),
        todo("Título — autor"),
        h(2, "Leyendo"),
        todo("Título — autor"),
        h(2, "Leídos"),
        todo("Título — autor", true),
      ],
    }),
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Básico",
  "Trabajo",
  "Personal",
];
