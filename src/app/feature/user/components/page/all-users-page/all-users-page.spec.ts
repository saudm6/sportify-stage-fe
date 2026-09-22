import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllUsersPage } from './all-users-page';
import { DEFAULT_PAGE_SIZE } from '../../../../../shared/functions/pagination';

describe('AllUsersPage', () => {
  let component: AllUsersPage;
  let fixture: ComponentFixture<AllUsersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllUsersPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AllUsersPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('users', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the app page size and disables Next for an empty result', () => {
    expect(component.pageSize()).toBe(DEFAULT_PAGE_SIZE);
    fixture.componentRef.setInput('totalPages', 0);
    fixture.detectChanges();
    const next = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent.trim() === 'Next');
    expect(next.disabled).toBe(true);
  });
});
