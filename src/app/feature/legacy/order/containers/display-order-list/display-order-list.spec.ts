import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayOrderList } from './display-order-list';

describe('DisplayOrderList', () => {
  let component: DisplayOrderList;
  let fixture: ComponentFixture<DisplayOrderList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayOrderList],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayOrderList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
