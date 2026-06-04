import { describe, it, expect } from "vitest";
import { extractStorageKeyFromUrl } from "./media-storage";

describe("extractStorageKeyFromUrl", () => {
  it("extrait la clé d'une URL média signée valide", () => {
    const url = "/api/media?key=audio/albums/3/track-x.mp3&exp=123&sig=abc";
    expect(extractStorageKeyFromUrl(url)).toBe("audio/albums/3/track-x.mp3");
  });

  it("accepte un chemin direct sous une racine autorisée", () => {
    expect(extractStorageKeyFromUrl("/images/albums/1/cover.webp")).toBe(
      "images/albums/1/cover.webp"
    );
  });

  it("rejette les tentatives de path traversal", () => {
    expect(
      extractStorageKeyFromUrl("/api/media?key=audio/albums/../../etc/passwd")
    ).toBeNull();
  });

  it("rejette une racine non autorisée", () => {
    expect(extractStorageKeyFromUrl("/secret/file.mp3")).toBeNull();
  });

  it("renvoie null pour une entrée vide", () => {
    expect(extractStorageKeyFromUrl(null)).toBeNull();
    expect(extractStorageKeyFromUrl(undefined)).toBeNull();
  });
});
