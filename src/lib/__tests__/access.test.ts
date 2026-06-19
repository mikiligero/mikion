import { describe, it, expect } from "vitest";
import { pickAccessRole } from "@/lib/access";

describe("pickAccessRole", () => {
  it("el dueño siempre es owner, sin importar los grants", () => {
    expect(pickAccessRole(true, [])).toBe("owner");
    expect(pickAccessRole(true, ["viewer", "editor"])).toBe("owner");
  });

  it("sin dueño ni grants no hay acceso", () => {
    expect(pickAccessRole(false, [])).toBeNull();
  });

  it("un único grant devuelve ese rol", () => {
    expect(pickAccessRole(false, ["viewer"])).toBe("viewer");
    expect(pickAccessRole(false, ["editor"])).toBe("editor");
  });

  it("entre varios grants gana el más alto (editor > viewer)", () => {
    expect(pickAccessRole(false, ["viewer", "editor"])).toBe("editor");
    expect(pickAccessRole(false, ["editor", "viewer"])).toBe("editor");
    expect(pickAccessRole(false, ["viewer", "viewer"])).toBe("viewer");
  });
});
