import { Component, inject, OnInit, signal, input, output } from '@angular/core';
import { UserData } from '../../../models/user-data';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../../../../shared/functions/pagination';

@Component({
  selector: 'app-all-users-page',
  imports: [],
  templateUrl: './all-users-page.html',
  styleUrl: './all-users-page.css',
})
export class AllUsersPage {

  readonly users = input.required<readonly UserData[]>();
  readonly isLoading = input(false);
  readonly pageNumber = input(1);
  readonly totalPages = input(1);
  readonly pageSize = input(DEFAULT_PAGE_SIZE);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS.filter((size) => size <= 10);
  readonly totalCount = input(1);

  readonly registerUser = output<void>();
  readonly editUser = output<string>();
  readonly deleteUser = output<string>();
  readonly pageChange = output<number>();
  readonly pageChangeSize = output<number>();

}
