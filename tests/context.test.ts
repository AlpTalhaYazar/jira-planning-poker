import { describe, expect, it } from "vitest";
import { assertProjectContext } from "../src/utils/context";

describe("project context helpers", () => {
  it("returns the project key when context matches", () => {
    const req = {
      context: {
        extension: { project: { key: "ABC" } },
      },
    };
    expect(assertProjectContext(req, "ABC")).toBe("ABC");
  });

  it("throws when project keys differ", () => {
    const req = {
      context: {
        extension: { project: { key: "ABC" } },
      },
    };
    expect(() => assertProjectContext(req, "XYZ")).toThrow(/Project mismatch/);
  });

  it("throws when context is missing", () => {
    expect(() => assertProjectContext({})).toThrow(
      /Project context is required/
    );
  });
});
