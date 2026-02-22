import type { UsersFiltersState, User } from "./types";

/**
 * Función pura de filtrado del dominio Usuarios.
 * Sin dependencias de React — testeable de forma aislada.
 */
export function filterUsers(users: User[], filters: UsersFiltersState): User[] {
  return users.filter((u) => {
    const search = filters.search.trim().toLowerCase();
    if (search) {
      const hayCoincidencia =
        u.nombre.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.rol.toLowerCase().includes(search);
      if (!hayCoincidencia) return false;
    }

    if (filters.role   && u.rol    !== filters.role)   return false;
    if (filters.estado && u.estado !== filters.estado) return false;

    if (filters.fechaDesde && u.ultimo < filters.fechaDesde) return false;
    if (filters.fechaHasta && u.ultimo > filters.fechaHasta) return false;

    return true;
  });
}
