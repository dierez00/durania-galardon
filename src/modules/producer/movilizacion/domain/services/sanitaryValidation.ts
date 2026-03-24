import type {
  AnimalSnapshot,
  AnimalValidationResult,
  FieldTestSnapshot,
  SanitaryValidationResult,
} from "../entities/SanitaryValidation";

function isValidNegativeTest(test: FieldTestSnapshot | undefined, todayIsoDate: string): boolean {
  if (!test || test.result !== "negative") {
    return false;
  }
  if (!test.validUntil) {
    return false;
  }
  return test.validUntil >= todayIsoDate;
}

export function evaluateSanitaryValidation(params: {
  animals: AnimalSnapshot[];
  tests: FieldTestSnapshot[];
  hasActiveQuarantine: boolean;
  todayIsoDate: string;
}): SanitaryValidationResult {
  const testsByAnimal = new Map<string, FieldTestSnapshot[]>();
  for (const test of params.tests) {
    const list = testsByAnimal.get(test.animalId) ?? [];
    list.push(test);
    testsByAnimal.set(test.animalId, list);
  }

  const animalsResult: AnimalValidationResult[] = params.animals.map((animal) => {
    const reasons: string[] = [];
    const tests = testsByAnimal.get(animal.id) ?? [];
    const tbTests = tests
      .filter((test) => test.testTypeKey === "tb")
      .sort((a, b) => b.sampleDate.localeCompare(a.sampleDate));
    const brTests = tests
      .filter((test) => test.testTypeKey === "br")
      .sort((a, b) => b.sampleDate.localeCompare(a.sampleDate));

    const latestTb = tbTests[0];
    const latestBr = brTests[0];

    if (!isValidNegativeTest(latestTb, params.todayIsoDate)) {
      reasons.push("TB no vigente o no negativa");
    }
    if (!isValidNegativeTest(latestBr, params.todayIsoDate)) {
      reasons.push("BR no vigente o no negativa");
    }

    if (latestTb?.result === "positive" || latestBr?.result === "positive") {
      reasons.push("Animal con estatus Reactor");
    }

    return {
      animalId: animal.id,
      siniigaTag: animal.siniigaTag,
      passed: reasons.length === 0,
      reasons,
    };
  });

  if (params.hasActiveQuarantine) {
    for (const animal of animalsResult) {
      animal.passed = false;
      animal.reasons = [...animal.reasons, "UPP bajo cerco sanitario activo"];
    }
  }

  return {
    passed: !params.hasActiveQuarantine && animalsResult.every((animal) => animal.passed),
    hasActiveQuarantine: params.hasActiveQuarantine,
    animals: animalsResult,
  };
}
