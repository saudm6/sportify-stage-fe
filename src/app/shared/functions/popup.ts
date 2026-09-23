import { ComponentType } from '@angular/cdk/portal';
import { DestroyRef, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

// Call in a component field initializer; the returned function opens feature-owned content.
export function popup() {
  const dialog = inject(MatDialog);
  const owner = inject(DestroyRef);

  return <Content, Data, Result = boolean>(content: ComponentType<Content>, data: Data) => {
    const ref = dialog.open<Content, Data, Result>(content, {
      data,
      width: '640px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: '90dvh',
      autoFocus: 'first-heading',
    });
    const unregister = owner.onDestroy(() => ref.close());
    ref.afterClosed().subscribe(() => unregister());
    return ref.afterClosed();
  };
}
