import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayOrderLineItemPage } from './display-order-line-item-page';

describe('DisplayOrderLineItemPage', () => {
  let component: DisplayOrderLineItemPage;
  let fixture: ComponentFixture<DisplayOrderLineItemPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayOrderLineItemPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayOrderLineItemPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
