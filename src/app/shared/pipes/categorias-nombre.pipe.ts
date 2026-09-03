import { Pipe, PipeTransform } from '@angular/core';
import type { CategoriaRef } from '../../core/models';

/**
 * Lista de categorías de un artículo → texto.
 * `[{nombre:'Arte'},{nombre:'Cultura'}]` → "Arte · Cultura".
 * Vacío → el texto de reserva (por defecto "Sin categoría").
 */
@Pipe({ name: 'categoriasNombre', standalone: true })
export class CategoriasNombrePipe implements PipeTransform {
  transform(
    cats: readonly CategoriaRef[] | null | undefined,
    vacio = 'Sin categoría',
  ): string {
    const nombres = (cats ?? []).map((c) => c.nombre).filter(Boolean);
    return nombres.length ? nombres.join(' · ') : vacio;
  }
}
