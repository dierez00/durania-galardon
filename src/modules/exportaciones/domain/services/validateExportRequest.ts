import { UPP_EXPORTACION_DOCUMENT_TYPES } from "@/modules/producer/documents/domain/entities/UppDocumentEntity";

export interface ExportAnimalSnapshot {
  id: string;
  sex: string | null;
  status: string;
  siniigaTag: string | null;
}

export interface ExportTestSnapshot {
  animalId: string;
  testType: string;
  result: string | null;
  validUntil: string | null;
}

export interface ExportDocumentSnapshot {
  documentType: string;
  status: string;
  expiryDate: string | null;
}

export interface Rule60ValidationResult {
  passed: boolean;
  thresholdPct: number;
  totalActiveAnimals: number;
  maleActiveAnimals: number;
  malePct: number;
}

export interface PillarsValidationResult {
  passed: boolean;
  hasDefinitiveQuarantine: boolean;
  invalidAnimalIds: string[];
  missingDocuments: string[];
  expiredDocuments: string[];
}

export interface ExportValidationResult {
  passed: boolean;
  rule60: Rule60ValidationResult;
  pillars: PillarsValidationResult;
  reasons: string[];
}

const REQUIRED_EXPORT_DOC_TYPES = new Set(
  UPP_EXPORTACION_DOCUMENT_TYPES.map((documentType) => documentType.key)
);

function normalizeResult(result: string | null): string {
  return (result ?? "").toLowerCase().trim();
}

function normalizeTestType(testType: string): string {
  return testType.toLowerCase().trim();
}

function isValidNegativeTest(test: ExportTestSnapshot | null, now: Date): boolean {
  if (!test?.validUntil) {
    return false;
  }

  const normalized = normalizeResult(test.result);
  if (normalized !== "negative" && normalized !== "negativo") {
    return false;
  }

  const validUntil = new Date(test.validUntil);
  return !Number.isNaN(validUntil.getTime()) && validUntil.getTime() >= now.getTime();
}

export function validateRule60ByActiveInventory(
  animals: ExportAnimalSnapshot[],
  thresholdPct: number
): Rule60ValidationResult {
  const activeAnimals = animals.filter((animal) => animal.status === "active");
  const maleActiveAnimals = activeAnimals.filter((animal) => (animal.sex ?? "").toUpperCase() === "M");
  const total = activeAnimals.length;
  const maleCount = maleActiveAnimals.length;
  const malePct = total > 0 ? Math.round((maleCount / total) * 10000) / 100 : 0;
  const passed = total > 0 && malePct <= thresholdPct;

  return {
    passed,
    thresholdPct,
    totalActiveAnimals: total,
    maleActiveAnimals: maleCount,
    malePct,
  };
}

export function validateFourPillars(params: {
  animals: ExportAnimalSnapshot[];
  tests: ExportTestSnapshot[];
  documents: ExportDocumentSnapshot[];
  hasDefinitiveQuarantine: boolean;
  now?: Date;
}): PillarsValidationResult {
  const now = params.now ?? new Date();
  const activeAnimals = params.animals.filter((animal) => animal.status === "active");

  const testsByAnimal = new Map<string, Map<string, ExportTestSnapshot>>();
  for (const test of params.tests) {
    const key = normalizeTestType(test.testType);
    if (!testsByAnimal.has(test.animalId)) {
      testsByAnimal.set(test.animalId, new Map<string, ExportTestSnapshot>());
    }

    const byType = testsByAnimal.get(test.animalId);
    if (!byType) {
      continue;
    }

    if (!byType.has(key)) {
      byType.set(key, test);
    }
  }

  const invalidAnimalIds: string[] = [];
  for (const animal of activeAnimals) {
    const animalTests = testsByAnimal.get(animal.id) ?? new Map<string, ExportTestSnapshot>();
    const tbTest = animalTests.get("tb") ?? null;
    const brTest = animalTests.get("br") ?? null;
    const hasIdentity = Boolean(animal.siniigaTag?.trim());

    if (!hasIdentity || !isValidNegativeTest(tbTest, now) || !isValidNegativeTest(brTest, now)) {
      invalidAnimalIds.push(animal.id);
    }
  }

  const validCurrentDocuments = params.documents.filter(
    (document) => document.status === "validated" || document.status === "pending"
  );
  const availableTypes = new Set(validCurrentDocuments.map((document) => document.documentType));

  const missingDocuments = [...REQUIRED_EXPORT_DOC_TYPES].filter((type) => !availableTypes.has(type));

  const expirableTypes = new Set<string>(
    UPP_EXPORTACION_DOCUMENT_TYPES.filter((type) => type.requiresExpiry).map((type) => type.key)
  );

  const expiredDocuments = validCurrentDocuments
    .filter((document) => expirableTypes.has(document.documentType) && document.expiryDate)
    .filter((document) => {
      const expiryDate = new Date(document.expiryDate as string);
      return !Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < now.getTime();
    })
    .map((document) => document.documentType);

  const passed =
    !params.hasDefinitiveQuarantine &&
    invalidAnimalIds.length === 0 &&
    missingDocuments.length === 0 &&
    expiredDocuments.length === 0;

  return {
    passed,
    hasDefinitiveQuarantine: params.hasDefinitiveQuarantine,
    invalidAnimalIds,
    missingDocuments,
    expiredDocuments,
  };
}

export function buildExportValidationResult(params: {
  animals: ExportAnimalSnapshot[];
  tests: ExportTestSnapshot[];
  documents: ExportDocumentSnapshot[];
  hasDefinitiveQuarantine: boolean;
  thresholdPct: number;
  now?: Date;
}): ExportValidationResult {
  const rule60 = validateRule60ByActiveInventory(params.animals, params.thresholdPct);
  const pillars = validateFourPillars({
    animals: params.animals,
    tests: params.tests,
    documents: params.documents,
    hasDefinitiveQuarantine: params.hasDefinitiveQuarantine,
    now: params.now,
  });

  const reasons: string[] = [];
  if (!rule60.passed) {
    reasons.push(
      `La Regla del ${rule60.thresholdPct}% no se cumple: ${rule60.malePct}% machos (${rule60.maleActiveAnimals}/${rule60.totalActiveAnimals}).`
    );
  }

  if (pillars.hasDefinitiveQuarantine) {
    reasons.push("El predio de origen tiene cuarentena definitiva activa.");
  }

  if (pillars.invalidAnimalIds.length > 0) {
    reasons.push(`Hay ${pillars.invalidAnimalIds.length} animales sin cumplimiento sanitario TB/BR o sin SINIIGA.`);
  }

  if (pillars.missingDocuments.length > 0) {
    reasons.push(`Faltan ${pillars.missingDocuments.length} documentos obligatorios de exportación.`);
  }

  if (pillars.expiredDocuments.length > 0) {
    reasons.push(`Hay ${pillars.expiredDocuments.length} documentos de exportación vencidos.`);
  }

  return {
    passed: rule60.passed && pillars.passed,
    rule60,
    pillars,
    reasons,
  };
}
