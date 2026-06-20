import { describe, it, expect } from "vitest";
import { buildExportHtml, buildExportMarkdown } from "@/lib/export-doc";

describe("buildExportHtml", () => {
  it("incluye portada, icono, título y tabla de propiedades", () => {
    const html = buildExportHtml(
      {
        id: "r1",
        title: "fdsfasd",
        emoji: "🤗",
        coverBg: 'url("/covers/x.webp") center 50% / cover no-repeat',
        properties: [
          { name: "Estado", value: "En progreso" },
          { name: "Lugar", value: "Movistar Arena" },
        ],
      },
      "<p>cuerpo</p>"
    );
    expect(html).toContain('class="cover"');
    expect(html).toContain("has-cover");
    expect(html).toContain("🤗");
    expect(html).toContain("<h1 class=\"title\">fdsfasd</h1>");
    expect(html).toContain("Estado");
    expect(html).toContain("En progreso");
    expect(html).toContain("Movistar Arena");
    expect(html).toContain("<p>cuerpo</p>");
  });

  it("sin portada no añade has-cover; propiedades vacías → guion", () => {
    const html = buildExportHtml(
      { id: "p1", title: "Página", properties: [{ name: "Notas", value: "" }] },
      "<p>x</p>"
    );
    expect(html).toContain('<main class="page">');
    expect(html).not.toContain('class="cover"');
    expect(html).toContain("—");
  });

  it("escapa HTML del título y propiedades", () => {
    const html = buildExportHtml(
      { id: "p1", title: "<script>", properties: [{ name: "a", value: "<b>" }] },
      ""
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;");
  });

  it("título vacío usa «Sin título»", () => {
    const html = buildExportHtml({ id: "p1", title: "  " }, "");
    expect(html).toContain("Sin título");
  });
});

describe("buildExportMarkdown", () => {
  it("encabeza con icono + título y lista las propiedades", () => {
    const md = buildExportMarkdown(
      {
        id: "r1",
        title: "fdsfasd",
        emoji: "🤗",
        properties: [{ name: "Estado", value: "En progreso" }],
      },
      "cuerpo en md"
    );
    expect(md).toContain("# 🤗 fdsfasd");
    expect(md).toContain("**Estado:** En progreso");
    expect(md).toContain("cuerpo en md");
  });
});
