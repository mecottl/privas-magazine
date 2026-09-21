import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroMedia } from '../../components/hero-media/hero-media';

@Component({
  selector: 'app-no-encontrado',
  standalone: true,
  imports: [RouterLink, HeroMedia],
  templateUrl: './no-encontrado.html',
  styleUrl: './no-encontrado.scss',
})
export class NoEncontrado {}
