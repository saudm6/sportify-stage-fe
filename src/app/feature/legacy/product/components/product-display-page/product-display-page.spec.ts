import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductDisplayPage } from './product-display-page';

describe('ProductDisplayPage', () => {
  let component: ProductDisplayPage;
  let fixture: ComponentFixture<ProductDisplayPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDisplayPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDisplayPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
