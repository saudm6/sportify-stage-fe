import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddProductPage } from './add-product-page';

describe('AddProductPage', () => {
  let component: AddProductPage;
  let fixture: ComponentFixture<AddProductPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddProductPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AddProductPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
