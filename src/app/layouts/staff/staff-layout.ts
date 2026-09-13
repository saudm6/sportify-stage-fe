import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PAGE_PATHS } from '../../core/urls';

@Component({
  selector: 'app-staff-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.css',
})
export class StaffLayout {
  readonly paths = PAGE_PATHS;
}
