import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { PAGE_PATHS } from '../../core/urls';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  readonly paths = PAGE_PATHS;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly inStaff = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(event => event.urlAfterRedirects.startsWith(`/${PAGE_PATHS.staff}/`)),
  ), { initialValue: this.router.url.startsWith(`/${PAGE_PATHS.staff}/`) });
}
