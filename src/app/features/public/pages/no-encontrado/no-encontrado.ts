import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrado',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './no-encontrado.html',
  styleUrl: './no-encontrado.scss',
})
export class NoEncontrado {}
