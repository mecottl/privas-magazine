import { Component } from '@angular/core';
import { HeroMedia } from '../../components/hero-media/hero-media';

/** "Sobre nosotros" (antes junto a Directorio). Texto pendiente de la clienta — issue #71. */
@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [HeroMedia],
  templateUrl: './sobre-nosotros.html',
  styleUrl: './sobre-nosotros.scss',
})
export class SobreNosotros {}
