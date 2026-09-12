import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthApiService } from '../../service/auth-api.service';
import { RegisterUserList } from './register-user-list';

describe('RegisterUserList', () => {
  const registerUser = vi.fn(() =>
    of({ id: '1', fullName: 'Test', email: 'test@example.com', createdAt: '' }),
  );

  beforeEach(async () => {
    registerUser.mockClear();
    await TestBed.configureTestingModule({
      imports: [RegisterUserList],
      providers: [provideRouter([]), { provide: AuthApiService, useValue: { registerUser } }],
    }).compileComponents();
  });

  it('creates with API and router providers', () => {
    expect(TestBed.createComponent(RegisterUserList).componentInstance).toBeTruthy();
  });
});
