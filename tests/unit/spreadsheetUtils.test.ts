import { describe, expect, it } from "vitest";
import type { SpreadsheetColumn } from "../../src/shared/ui/spreadsheet";
import { buildExcelBuffer, validateRows } from "../../src/shared/ui/spreadsheet/utils";
import * as XLSX from "xlsx";

interface ProductorRow {
  email: string;
  fullName: string;
  curp?: string;
}

const columns: SpreadsheetColumn<ProductorRow>[] = [
  {
    key: "email",
    header: "Email",
    required: true,
    normalize: (value) => value.trim().toLowerCase(),
    validate: (value) => (value.includes("@") ? null : "Email invalido."),
  },
  {
    key: "fullName",
    header: "Nombre",
    required: true,
    normalize: (value) => value.trim(),
  },
  {
    key: "curp",
    header: "CURP",
    required: false,
    normalize: (value) => value.trim().toUpperCase(),
  },
];

describe("spreadsheet utils", () => {
  it("normaliza y valida filas", () => {
    const result = validateRows<ProductorRow>(
      [
        { email: " TEST@MAIL.COM ", fullName: "  Maria  ", curp: "abcd1234" },
        { email: "invalido", fullName: "", curp: "" },
      ],
      columns
    );

    expect(result.nonEmptyRows).toHaveLength(2);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.hasErrors).toBe(true);
    expect(result.normalizedRows[0].email).toBe("test@mail.com");
    expect(result.normalizedRows[0].fullName).toBe("Maria");
    expect(result.normalizedRows[0].curp).toBe("ABCD1234");
  });

  it("genera Excel buffer con datos correctos", () => {
    const buffer = buildExcelBuffer(["nombre", "nota"], [["Juan", 'Dice "hola"']]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Parse the generated buffer and verify contents
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    expect(rows[0]).toEqual(["nombre", "nota"]);
    expect(rows[1]).toEqual(["Juan", 'Dice "hola"']);
  });
});
