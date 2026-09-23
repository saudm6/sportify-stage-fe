import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MAT_DIALOG_DEFAULT_OPTIONS,
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { Popup } from '../components/popup/popup';
import { popup } from './popup';

@Component({
  imports: [Popup],
  template: `<app-popup
    [title]="title"
    submitLabel="Confirm"
    [loading]="loading()"
    [saving]="saving()"
    [error]="error()"
    (submitted)="submit()"
  >
    <label>Note<input value="Keep this text" /></label>
  </app-popup>`,
})
class ExamplePopup {
  readonly title = inject<string>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  submit = vi.fn(() => this.saving.set(true));
}

@Component({ template: '' })
class Owner {
  readonly openPopup = popup();
}

describe('Shared popup', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: {
            ...new MatDialogConfig(),
            enterAnimationDuration: 0,
            exitAnimationDuration: 0,
          },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(MatDialog).closeAll());

  const settle = async () => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it('renders feature content and labels, blocks closing/submission while saving, retains errors and returns the result', async () => {
    const owner = TestBed.createComponent(Owner);
    const result = vi.fn();
    owner.componentInstance
      .openPopup<ExamplePopup, string, string>(ExamplePopup, 'Confirm note')
      .subscribe(result);
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    const content = ref.componentInstance as ExamplePopup;
    await settle();
    const root = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(root.querySelector('h2')?.textContent).toContain('Confirm note');
    expect(root.getAttribute('aria-labelledby')).toBe(root.querySelector('h2')!.id);
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Loading');
    expect(root.querySelector('form')).toBeNull();
    content.loading.set(false);
    await settle();
    const form = root.querySelector('form')!;
    expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Confirm');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(content.submit).toHaveBeenCalledOnce();
    expect(ref.disableClose).toBe(true);
    expect(root.querySelector('fieldset')?.disabled).toBe(true);
    root.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(content.submit).toHaveBeenCalledOnce();
    expect(result).not.toHaveBeenCalled();
    content.saving.set(false);
    content.error.set('Please try again.');
    await settle();
    expect(ref.disableClose).toBe(false);
    expect(root.querySelector('input')?.value).toBe('Keep this text');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Please try again.');
    ref.close('confirmed');
    await settle();
    expect(result).toHaveBeenCalledWith('confirmed');
    owner.destroy();
  });

  it('cancels normally and closes its popup when the owning page is destroyed', async () => {
    const owner = TestBed.createComponent(Owner);
    const cancelled = vi.fn();
    owner.componentInstance.openPopup(ExamplePopup, 'First').subscribe(cancelled);
    await settle();
    document.querySelector<HTMLButtonElement>('[role="dialog"] button')!.click();
    await settle();
    expect(cancelled).toHaveBeenCalledWith(undefined);
    const closed = vi.fn();
    owner.componentInstance.openPopup(ExamplePopup, 'Second').subscribe(closed);
    await settle();
    owner.destroy();
    await settle();
    expect(closed).toHaveBeenCalledWith(undefined);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
