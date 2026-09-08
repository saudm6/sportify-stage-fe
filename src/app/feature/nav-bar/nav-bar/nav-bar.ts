import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { hasStaffAccess } from '../../../core/staff-access';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  readonly hasStaffAccess = hasStaffAccess;
}
