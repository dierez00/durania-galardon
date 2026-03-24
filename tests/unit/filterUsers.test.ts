import { describe, it, expect } from "vitest";
import { filterUsers } from "../../src/modules/usuarios/domain/services/filterUsers";
import type { User, UsersFiltersState } from "../../src/modules/usuarios/domain/entities/User";

const baseUsers: User[] = [
  {
    id: 1,
    nombre: "Carlos Admin",
    email: "carlos@example.com",
    rol: "Administrador",
    estado: "Activo",
    ultimo: "2024-08-15",
  },
  {
    id: 2,
    nombre: "Ana MVZ",
    email: "ana@example.com",
    rol: "MVZ",
    estado: "Inactivo",
    ultimo: "2024-07-10",
  },
];

const emptyFilters: UsersFiltersState = {
  search: "",
  role: "",
  estado: "",
  fechaDesde: "",
  fechaHasta: "",
};

describe("filterUsers", () => {
  it("returns all users with empty filters", () => {
    const result = filterUsers(baseUsers, emptyFilters);
    expect(result).toHaveLength(2);
  });

  it("filters by search text", () => {
    const result = filterUsers(baseUsers, { ...emptyFilters, search: "ana" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(2);
  });

  it("filters by role and status", () => {
    const result = filterUsers(baseUsers, {
      ...emptyFilters,
      role: "Administrador",
      estado: "Activo",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });
});
