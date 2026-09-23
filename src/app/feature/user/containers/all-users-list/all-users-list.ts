import { Component, inject, OnInit } from '@angular/core';
import { UserService } from '../../service';
import { UserData } from '../../models/user-data';
import { AllUsersPage } from '../../components/page/all-users-page/all-users-page';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditUsersDialog } from '../../components/dialog/edit-users-dialog/edit-users-dialog';
import { DeleteUserDialog } from '../../components/dialog/delete-user-dialog/delete-user-dialog';
import { Router } from '@angular/router';
import { PAGE_PATHS } from '../../../../core/urls';
import { rxState, RxState } from '@rx-angular/state';
import { finalize, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { defaultPagination, PaginationState, updatePagination } from '../../../../shared/functions/pagination';

interface AllUserState {
  users: UserData[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  isLoading: boolean;
  totalPages: number;
}

type ViewModel = AllUserState;

@Component({
  selector: 'app-all-users-list',
  imports: [AllUsersPage, MatDialogModule, AsyncPipe],
  providers: [RxState],
  templateUrl: './all-users-list.html',
  styleUrl: './all-users-list.css',
})
export class AllUsersList implements OnInit {

  private readonly state = rxState<AllUserState>();

  vm$: Observable<ViewModel>;

  private readonly dialog = inject(MatDialog);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  constructor() {
    this.state.set({
      users: [],
      totalCount: 0,
      pageNumber: defaultPagination().page,
      pageSize: defaultPagination().pageSize,
      isLoading: false,
      totalPages: 0,
    });

    this.vm$ = this.state.select();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  changePage(page: number): void {
    this.changePagination({ page });
  }

  changePageSize(pageSize: number): void {
    this.changePagination({ pageSize });
  }

  private changePagination(change: Partial<PaginationState>): void {
    const pagination = updatePagination(
      { page: this.state.get('pageNumber'), pageSize: this.state.get('pageSize') },
      change,
      this.state.get('totalPages'),
      10,
    );
    if (pagination) {
      this.state.set({ pageNumber: pagination.page, pageSize: pagination.pageSize });
      this.loadUsers();
    }
  }

  registerUser(): void {
    this.router.navigate([`/${PAGE_PATHS.register}`]);
  }

  editUser(userId: string): void {
    const dialogRef = this.dialog.open(EditUsersDialog, {
      width: '720px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,

      data: { userId },
    });
    dialogRef.afterClosed().subscribe((updated: boolean) => {
      if (updated) {
        this.loadUsers();
      }
    });
  }

  loadUsers(): void {
    this.state.set({ isLoading: true });
    this.userService.getPagedUsers(this.state.get('pageNumber'), this.state.get('pageSize'))
    .pipe(
      finalize(() => {
        this.state.set({ isLoading: false });
      }),
    )
    .subscribe({
      next: (result) => {
        this.state.set({
          users: result.items,
          totalCount: result.totalCount,
          pageNumber: result.pageNumber,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        });
      },
      error: (error) => {
        console.error('Error loading users:', error);
      },
    });
  }

  deleteUser(userId: string): void {
    const user = this.state.get('users').find((item) => item.id === userId);

    const userName = user?.fullName ?? 'this user';

    const dialogRef = this.dialog.open(DeleteUserDialog, {
      width: '460px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        userId,
        userName,
      },
    });

    dialogRef.afterClosed().subscribe((deleted: boolean) => {
      if (deleted) {
        if (this.state.get('users').length === 1 && this.state.get('pageNumber') > 1) {
          this.state.set({ pageNumber: this.state.get('pageNumber') - 1, });
        }
        this.loadUsers();
      }
    });
  }
}
