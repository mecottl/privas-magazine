import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HeroMedia } from '../../components/hero-media/hero-media';
import { DOCUMENTOS_LEGALES, type DocumentoLegal } from './contenido-legal';

/**
 * Página de documento legal (Aviso de Privacidad, Términos y Condiciones).
 * Una sola plantilla: la ruta indica cuál mostrar con `data: { doc }`.
 * El contenido vive en `contenido-legal.ts` (hoy lorem ipsum, ver issues #8 y #70).
 */
@Component({
  selector: 'app-pagina-legal',
  standalone: true,
  imports: [HeroMedia],
  templateUrl: './pagina-legal.html',
  styleUrl: './pagina-legal.scss',
})
export class PaginaLegal {
  readonly doc: DocumentoLegal =
    DOCUMENTOS_LEGALES[inject(ActivatedRoute).snapshot.data['doc']] ?? DOCUMENTOS_LEGALES['privacidad'];
}
