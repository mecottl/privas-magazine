import { Component } from '@angular/core';

interface Colaborador {
  nombre: string;
  rol: string;
}

/**
 * Issue #68 — equipo fijo en código (4 personas, cambia poco). Se
 * revisará una tabla + CRUD si algún día hace falta administrarlo seguido,
 * igual que se decidió para Nuestras Marcas.
 */
const EQUIPO: Colaborador[] = [
  { nombre: 'Roxana Rivas', rol: 'CEO' },
  { nombre: 'Moisés Prieto', rol: 'Director de Ventas' },
  { nombre: 'Majo Prieto', rol: 'Diseño Gráfico' },
  { nombre: 'Gerardo Mecott', rol: 'Ingeniero Web' },
];

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  templateUrl: './colaboradores.html',
  styleUrl: './colaboradores.scss',
})
export class Colaboradores {
  readonly equipo = EQUIPO;
}
