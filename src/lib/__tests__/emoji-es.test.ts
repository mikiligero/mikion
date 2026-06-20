import { describe, it, expect } from "vitest";
import { translateEmojiQuery } from "@/lib/emoji-es";

describe("translateEmojiQuery", () => {
  it("traduce términos comunes ES → EN", () => {
    expect(translateEmojiQuery("fuego")).toBe("fire");
    expect(translateEmojiQuery("corazon")).toBe("heart");
    expect(translateEmojiQuery("perro")).toBe("dog");
  });

  it("ignora acentos", () => {
    expect(translateEmojiQuery("corazón")).toBe("heart");
    expect(translateEmojiQuery("avión")).toBe("airplane");
  });

  it("admite plural simple (s final)", () => {
    expect(translateEmojiQuery("gatos")).toBe("cat");
    expect(translateEmojiQuery("perros")).toBe("dog");
  });

  it("traduce varias palabras y deja intactas las desconocidas", () => {
    expect(translateEmojiQuery("cara feliz")).toBe("face happy smile");
    expect(translateEmojiQuery("zzqq")).toBe("zzqq");
  });

  it("deja pasar consultas en inglés", () => {
    expect(translateEmojiQuery("fire")).toBe("fire");
    expect(translateEmojiQuery("rocket")).toBe("rocket");
  });

  it("resuelve prefijos para no cerrar el menú al escribir", () => {
    // «fue» debe resolver ya a «fire» (de «fuego»), no quedarse sin resultados.
    expect(translateEmojiQuery("fue")).toBe("fire");
    expect(translateEmojiQuery("cora")).toBe("heart");
  });
});
