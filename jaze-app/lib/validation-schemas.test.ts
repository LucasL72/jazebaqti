import { describe, it, expect } from "vitest";
import {
  createPlaylistSchema,
  reorderPlaylistSchema,
  addPlaylistTrackSchema,
  validateSchema,
} from "./validation-schemas";

describe("schemas playlists", () => {
  it("valide un nom de playlist correct", () => {
    const r = validateSchema(createPlaylistSchema, { name: "Mes favoris" });
    expect(r.success).toBe(true);
  });

  it("rejette un nom vide", () => {
    const r = validateSchema(createPlaylistSchema, { name: "  " });
    expect(r.success).toBe(false);
  });

  it("valide une liste de réordonnancement", () => {
    const r = validateSchema(reorderPlaylistSchema, { trackIds: [3, 1, 2] });
    expect(r.success).toBe(true);
  });

  it("rejette un trackId non entier", () => {
    const r = validateSchema(addPlaylistTrackSchema, { trackId: "abc" });
    expect(r.success).toBe(false);
  });
});
