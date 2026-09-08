import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayOrderLineItemList } from './display-order-line-item-list';

describe('DisplayOrderLineItemList', () => {
  let component: DisplayOrderLineItemList;
  let fixture: ComponentFixture<DisplayOrderLineItemList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayOrderLineItemList],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayOrderLineItemList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
