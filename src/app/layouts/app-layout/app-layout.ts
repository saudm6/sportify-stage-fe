import { CdkTrapFocus } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationSkipped, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { PAGE_PATHS } from '../../core/urls';

@Component({
  selector: 'app-layout',
  imports: [CdkTrapFocus, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout {
  readonly paths = PAGE_PATHS;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('sidebarToggle');
  private readonly desktopCollapsed = signal(false);
  private readonly mobileOpen = signal(false);
  readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 900px)').pipe(
    map(state => state.matches),
  ), { initialValue: false });
  readonly expanded = computed(() => this.mobile() ? this.mobileOpen() : !this.desktopCollapsed());
  readonly modal = computed(() => this.mobile() && this.expanded());
  readonly inStaff = signal(this.router.url.startsWith(`/${PAGE_PATHS.staff}/`));

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd || event instanceof NavigationSkipped), takeUntilDestroyed(),
    ).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.inStaff.set(event.urlAfterRedirects.startsWith(`/${PAGE_PATHS.staff}/`));
      }
      this.closeMobile();
    });
  }

  toggleSidebar(): void {
    if (this.mobile()) this.mobileOpen.update(open => !open);
    else this.desktopCollapsed.update(collapsed => !collapsed);
  }

  closeMobile(): void {
    if (!this.mobileOpen()) return;
    this.mobileOpen.set(false);
    this.toggle()?.nativeElement.focus();
  }
}
