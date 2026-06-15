import { describe, it, expect } from "vitest";
import { embedInfo, embedHeight } from "@/lib/embed";

describe("embedInfo", () => {
  it("YouTube (watch y youtu.be) → iframe /embed/ID", () => {
    expect(embedInfo("https://www.youtube.com/watch?v=abc123")).toMatchObject({
      provider: "youtube",
      kind: "iframe",
      src: "https://www.youtube.com/embed/abc123",
    });
    expect(embedInfo("https://youtu.be/xyz789")?.src).toBe(
      "https://www.youtube.com/embed/xyz789"
    );
  });

  it("Vimeo → player.vimeo.com", () => {
    expect(embedInfo("https://vimeo.com/123456789")).toMatchObject({
      provider: "vimeo",
      src: "https://player.vimeo.com/video/123456789",
    });
  });

  it("Spotify → /embed", () => {
    expect(embedInfo("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")?.src).toBe(
      "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"
    );
  });

  it("Loom → /embed/ID", () => {
    expect(embedInfo("https://www.loom.com/share/deadbeef")?.src).toBe(
      "https://www.loom.com/embed/deadbeef"
    );
  });

  it("Figma → figma.com/embed", () => {
    const r = embedInfo("https://www.figma.com/design/AbC/Mi-archivo");
    expect(r?.provider).toBe("figma");
    expect(r?.src).toContain("https://www.figma.com/embed?embed_host=mikion&url=");
  });

  it("Google Maps → output=embed", () => {
    const r = embedInfo("https://www.google.com/maps/place/Madrid");
    expect(r?.provider).toBe("maps");
    expect(r?.src).toContain("output=embed");
  });

  it("URL cualquiera → marcador con dominio", () => {
    expect(embedInfo("https://example.com/articulo")).toMatchObject({
      provider: "bookmark",
      kind: "bookmark",
      domain: "example.com",
    });
  });

  it("sin esquema se asume https", () => {
    expect(embedInfo("example.com")?.domain).toBe("example.com");
  });

  it("texto no-URL → null", () => {
    expect(embedInfo("   ")).toBeNull();
  });
});

describe("embedHeight", () => {
  it("spotify usa altura fija; el resto 16:9", () => {
    expect(embedHeight("spotify")).toBe("352px");
    expect(embedHeight("youtube")).toBe("aspect-video");
    expect(embedHeight("maps")).toBe("aspect-video");
  });
});
