import { describe, it, expect } from "vitest";
import { parseCSV } from "./csv.server";

describe("parseCSV", () => {
  it("returns empty for empty input", () => {
    expect(parseCSV("")).toEqual({ columns: [], rows: [] });
  });

  it("parses a header + numeric rows, coercing numbers", () => {
    const { columns, rows } = parseCSV("a,b\n1,2\n3,4");
    expect(columns).toEqual(["a", "b"]);
    expect(rows).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  it("keeps non-numeric values as strings", () => {
    const { rows } = parseCSV("name\nhello");
    expect(rows[0].name).toBe("hello");
  });

  it("honors quoted fields containing a comma (RFC 4180)", () => {
    const { rows } = parseCSV('name,val\n"Smith, John",5');
    expect(rows[0].name).toBe("Smith, John");
    expect(rows[0].val).toBe(5);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    const { rows } = parseCSV('q\n"He said ""hi"""');
    expect(rows[0].q).toBe('He said "hi"');
  });

  it("maps empty cells to null", () => {
    const { rows } = parseCSV("a,b\n,5");
    expect(rows[0].a).toBeNull();
    expect(rows[0].b).toBe(5);
  });

  it("ignores blank lines (CRLF tolerant)", () => {
    const { rows } = parseCSV("a\r\n1\r\n\r\n2\r\n");
    expect(rows).toEqual([{ a: 1 }, { a: 2 }]);
  });
});
