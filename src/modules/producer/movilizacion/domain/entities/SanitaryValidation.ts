export interface AnimalSnapshot {
  id: string;
  uppId: string;
  siniigaTag: string;
  status: string;
}

export interface FieldTestSnapshot {
  animalId: string;
  testTypeKey: string;
  result: "negative" | "positive" | "inconclusive";
  sampleDate: string;
  validUntil: string | null;
}

export interface AnimalValidationResult {
  animalId: string;
  siniigaTag: string;
  passed: boolean;
  reasons: string[];
}

export interface SanitaryValidationResult {
  passed: boolean;
  hasActiveQuarantine: boolean;
  animals: AnimalValidationResult[];
}
