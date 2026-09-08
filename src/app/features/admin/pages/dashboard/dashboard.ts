import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import type { Articulo } from '../../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly artSrv = inject(ArticulosService);
  private readonly edSrv = inject(EdicionesService);
  private readonly catSrv = inject(CategoriasService);

  private readonly articulos = signal<Articulo[]>([]);
  readonly ediciones = signal(0);
  readonly categorias = signal(0);

  readonly nombre = computed(
    () => this.auth.perfil()?.nombre_visible?.split(' ')[0] || 'administrador',
  );

  readonly publicados = computed(
    () => this.articulos().filter((a) => a.estado === 'publicado').length,
  );
  readonly borradores = computed(
    () => this.articulos().filter((a) => a.estado === 'borrador').length,
  );
  readonly programados = computed(
    () => this.articulos().filter((a) => a.estado === 'programado').length,
  );

  async ngOnInit() {
    this.articulos.set(await this.artSrv.listarAdmin().catch(() => []));
    this.ediciones.set((await this.edSrv.listarAdmin().catch(() => [])).length);
    this.categorias.set((await this.catSrv.listar().catch(() => [])).length);
  }
}
