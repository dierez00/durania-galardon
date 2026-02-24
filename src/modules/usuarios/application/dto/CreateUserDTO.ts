export interface CreateUserDTO {
  nombre: string;
  email: string;
  rol: string;
  estado?: "Activo" | "Inactivo";
}
