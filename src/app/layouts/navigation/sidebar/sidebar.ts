import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, NavigationSkipped, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { PAGE_PATHS } from '../../../core/urls';

@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: {
    '[hidden]': '!visible()',
    '[class.collapsed]': '!expanded()',
    '[class.mobile]': 'mobile()',
  },
})
export class Sidebar {
  readonly paths = PAGE_PATHS;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('mobileTrigger');
  private readonly desktopCollapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 900px)').pipe(
    map(state => state.matches),
  ), { initialValue: false });
  private readonly protectedRoute = signal(this.routeHasSidebar());
  readonly visible = computed(() => !!this.auth.session() && this.protectedRoute());
  readonly expanded = computed(() => this.mobile() ? this.mobileOpen() : !this.desktopCollapsed());
  readonly inStaff = signal(this.router.url.startsWith(`/${PAGE_PATHS.staff}/`));

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd || event instanceof NavigationSkipped), takeUntilDestroyed(),
    ).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.inStaff.set(event.urlAfterRedirects.startsWith(`/${PAGE_PATHS.staff}/`));
        this.protectedRoute.set(this.routeHasSidebar());
      }
      this.closeMobile();
    });
    effect(() => {
      if (!this.visible() || !this.mobile()) this.closeMobile();
    });
    inject(DestroyRef).onDestroy(() => {
      const dialog = this.drawer()?.nativeElement;
      if (dialog?.open) dialog.close();
    });
  }

  toggleSidebar(): void {
    this.desktopCollapsed.update(collapsed => !collapsed);
  }

  openMobile(): void {
    this.drawer()?.nativeElement.showModal();
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    const dialog = this.drawer()?.nativeElement;
    if (!dialog?.open) return;
    dialog.close();
    this.mobileOpen.set(false);
    if (this.visible() && this.mobile()) this.trigger()?.nativeElement.focus();
  }

  dialogClosed(): void {
    this.mobileOpen.set(this.drawer()?.nativeElement.open ?? false);
  }

  dismissBackdrop(event: MouseEvent): void {
    const dialog = this.drawer()!.nativeElement;
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom)) this.closeMobile();
  }

  private routeHasSidebar(): boolean {
    let route: ActivatedRouteSnapshot | undefined = this.router.routerState.snapshot.root;
    while (route) {
      if (route.data['showSidebar'] === true) return true;
      route = route.children.find(child => child.outlet === 'primary');
    }
    return false;
  }
}
