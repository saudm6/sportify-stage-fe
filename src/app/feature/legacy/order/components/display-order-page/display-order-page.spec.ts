import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayOrderPage } from './display-order-page';

describe('DisplayOrderPage', () => {
  let component: DisplayOrderPage;
  let fixture: ComponentFixture<DisplayOrderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayOrderPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayOrderPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
