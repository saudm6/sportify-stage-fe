import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddProductList } from './add-product-list';

describe('AddProductList', () => {
  let component: AddProductList;
  let fixture: ComponentFixture<AddProductList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddProductList],
    }).compileComponents();

    fixture = TestBed.createComponent(AddProductList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
