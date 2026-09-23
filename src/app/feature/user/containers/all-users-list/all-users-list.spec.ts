import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PAGE_SIZE } from '../../../../shared/functions/pagination';
import { AllUsersList } from './all-users-list';

describe('AllUsersList pagination', () => {
  it('uses shared defaults, handles UI events and rejects invalid API pagination', () => {
    TestBed.configureTestingModule({
      imports: [AllUsersList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AllUsersList);
    const component = fixture.componentInstance;
    const respond = (pageNumber: number, pageSize: number, totalPages = 3) => {
      const request = http.expectOne((req) => req.url.endsWith(`?pageNumber=${pageNumber}&pageSize=${pageSize}`));
      request.flush({ items: [], totalCount: totalPages * pageSize, totalPages, pageNumber, pageSize });
      fixture.detectChanges();
    };

    fixture.detectChanges();
    respond(1, DEFAULT_PAGE_SIZE);
    const next = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent.trim() === 'Next');
    next.click();
    respond(2, DEFAULT_PAGE_SIZE);

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect([...select.options].every((option) => Number(option.value) <= 10)).toBe(true);
    select.value = '10';
    select.dispatchEvent(new Event('change'));
    respond(1, 10);
    expect(fixture.nativeElement.querySelector('select').value).toBe('10');

    for (const page of [0, 1.5, NaN, Infinity, 4, 101]) component.changePage(page);
    for (const size of [0, 1.5, NaN, Infinity, 20]) component.changePageSize(size);
    http.expectNone(() => true);

    component.loadUsers();
    respond(1, 10, 101);
    component.changePage(100);
    respond(100, 10, 101);
    const nextAfter100 = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent.trim() === 'Next');
    expect(nextAfter100.disabled).toBe(false);
    nextAfter100.click();
    respond(101, 10, 101);
    expect(fixture.nativeElement.textContent).toMatch(/Page\s+101\s+of\s+101/);
    expect(nextAfter100.disabled).toBe(true);
    component.changePage(102);
    http.expectNone(() => true);
    http.verify();
    fixture.destroy();
  });
});
