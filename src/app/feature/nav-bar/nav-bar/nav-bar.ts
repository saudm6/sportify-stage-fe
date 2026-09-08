import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { hasAnyRole } from '../../../core/role.guard';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  readonly hasAnyRole = hasAnyRole;
}
