import { Component } from '@angular/core';
import { HeroMedia } from '../../components/hero-media/hero-media';

interface MiembroDirectorio {
  rol: string;
  nombre: string;
  correo: string;
  /** Sitio propio (ej. portafolio) al que apunta el nombre, si tiene. */
  url?: string;
}

/** Directorio del equipo (antes vivía junto a "Sobre nosotros" y Colaboradores en una sola página). */
const DIRECTORIO: MiembroDirectorio[] = [
  { rol: 'Dirección editorial', nombre: 'Roxana Rivas', correo: 'contacto@privasmagazine.com' },
  { rol: 'Dirección de ventas y publicidad', nombre: 'Moisés Prieto', correo: 'ventas@privasmagazine.com' },
  { rol: 'Diseño gráfico', nombre: 'Majo Prieto', correo: 'grafico@privasmagazine.com' },
  { rol: 'Social media / marketing', nombre: 'Majo Prieto', correo: 'smmarketing@privasmagazine.com' },
  {
    rol: 'Diseñador web',
    nombre: 'Ing. Gerardo Mecott',
    correo: 'gerardomecott@outlook.com',
    url: 'https://gerardomecott.dev',
  },
];

@Component({
  selector: 'app-directorio',
  standalone: true,
  imports: [HeroMedia],
  templateUrl: './directorio.html',
  styleUrl: './directorio.scss',
})
export class Directorio {
  readonly directorio = DIRECTORIO;
}
