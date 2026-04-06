import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { SpreadsheetColumn } from "../../src/shared/ui/spreadsheet";
import { buildExcelBuffer, validateRows } from "../../src/shared/ui/spreadsheet/utils";

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

  it("genera Excel buffer con datos correctos", async () => {
    const buffer = await buildExcelBuffer(["nombre", "nota"], [["Juan", 'Dice "hola"']]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    expect(sheet?.getRow(1).values).toEqual([, "nombre", "nota"]);
    expect(sheet?.getRow(2).values).toEqual([, "Juan", 'Dice "hola"']);
  });
});
