import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductDisplayList } from './product-display-list';

describe('ProductDisplayList', () => {
  let component: ProductDisplayList;
  let fixture: ComponentFixture<ProductDisplayList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDisplayList],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDisplayList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
