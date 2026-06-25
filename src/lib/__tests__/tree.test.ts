import { describe, it, expect } from "vitest";
import {
  buildTree,
  buildForest,
  ancestorChain,
  type TreeDoc,
} from "@/lib/tree";

function d(p: Partial<TreeDoc> & { id: string }): TreeDoc {
  return {
    parentId: null,
    section: "team",
    kind: "page",
    emoji: null,
    title: "",
    isFavorite: false,
    orderKey: "a0",
    ...p,
  };
}

describe("buildTree", () => {
  const docs: TreeDoc[] = [
    d({ id: "b", orderKey: "a1" }),
    d({ id: "a", orderKey: "a0" }),
    d({ id: "a1", parentId: "a", orderKey: "a1" }),
    d({ id: "a0", parentId: "a", orderKey: "a0" }),
    d({ id: "p", section: "private", orderKey: "a0" }),
  ];

  it("agrupa por sección y ordena raíces por orderKey", () => {
    const team = buildTree(docs, "team");
    expect(team.map((n) => n.id)).toEqual(["a", "b"]);
    const priv = buildTree(docs, "private");
    expect(priv.map((n) => n.id)).toEqual(["p"]);
  });

  it("anida hijos por parentId, ordenados por orderKey", () => {
    const [a] = buildTree(docs, "team");
    expect(a.children.map((n) => n.id)).toEqual(["a0", "a1"]);
    expect(a.children.every((n) => n.children.length === 0)).toBe(true);
  });

  it("ignora docs de otra sección al anidar", () => {
    const team = buildTree(docs, "team");
    expect(team.find((n) => n.id === "p")).toBeUndefined();
  });

  it("devuelve [] si no hay docs en la sección", () => {
    expect(buildTree([], "team")).toEqual([]);
  });

  it("saca a la luz huérfanos (parent borrado) como nodos raíz", () => {
    // "x" no está (en papelera); su hijo "orf" y el nieto "orf2" no deben
    // desaparecer: "orf" sube a raíz con su subárbol.
    const withOrphan: TreeDoc[] = [
      d({ id: "a", orderKey: "a0" }),
      d({ id: "orf", parentId: "x", orderKey: "a5", title: "Huérfano" }),
      d({ id: "orf2", parentId: "orf", orderKey: "a0" }),
    ];
    const team = buildTree(withOrphan, "team");
    expect(team.map((n) => n.id).sort()).toEqual(["a", "orf"]);
    const orf = team.find((n) => n.id === "orf")!;
    expect(orf.children.map((n) => n.id)).toEqual(["orf2"]);
  });

  it("un parent en otra sección también deja huérfano (sube a raíz)", () => {
    const cross: TreeDoc[] = [
      d({ id: "teamRoot", section: "team", orderKey: "a0" }),
      d({ id: "child", section: "private", parentId: "teamRoot" }),
    ];
    const priv = buildTree(cross, "private");
    expect(priv.map((n) => n.id)).toEqual(["child"]);
  });
});

describe("buildForest", () => {
  // Raíz compartida "mid" cuyo parentId apunta a un ancestro NO visible ("root").
  const docs: TreeDoc[] = [
    d({ id: "mid", parentId: "root", orderKey: "a0" }),
    d({ id: "leaf", parentId: "mid", orderKey: "a1" }),
    d({ id: "leaf2", parentId: "mid", orderKey: "a0" }),
  ];

  it("trata cada rootId como nivel superior aunque su parent quede fuera", () => {
    const forest = buildForest(docs, ["mid"]);
    expect(forest.map((n) => n.id)).toEqual(["mid"]);
    expect(forest[0].children.map((n) => n.id)).toEqual(["leaf2", "leaf"]);
  });

  it("soporta varias raíces compartidas de distintas secciones", () => {
    const multi: TreeDoc[] = [
      d({ id: "x", parentId: "ext", section: "team", orderKey: "a0" }),
      d({ id: "y", parentId: "ext2", section: "private", orderKey: "a1" }),
    ];
    const forest = buildForest(multi, ["x", "y"]);
    expect(forest.map((n) => n.id)).toEqual(["x", "y"]);
  });

  it("devuelve [] sin docs", () => {
    expect(buildForest([], [])).toEqual([]);
  });
});

describe("ancestorChain", () => {
  const docs: TreeDoc[] = [
    d({ id: "root" }),
    d({ id: "mid", parentId: "root" }),
    d({ id: "leaf", parentId: "mid" }),
  ];

  it("devuelve la cadena de raíz a hijo incluido", () => {
    expect(ancestorChain(docs, "leaf").map((n) => n.id)).toEqual([
      "root",
      "mid",
      "leaf",
    ]);
  });

  it("para una raíz devuelve solo ella", () => {
    expect(ancestorChain(docs, "root").map((n) => n.id)).toEqual(["root"]);
  });

  it("devuelve [] si el id no existe", () => {
    expect(ancestorChain(docs, "x")).toEqual([]);
  });
});
