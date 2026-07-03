import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmationDialogComponent } from '../../modules/shared/components/dialogComponents/confirmation-dialog';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  // Reference to the currently opened dialog
  dialogRef: any;

  constructor(private dialog: MatDialog, private _snackBar: MatSnackBar) { }

  /**
   * Opens a dialog with custom options
   * @param content - Component or template to be rendered in dialog
   * @param width - Width of the dialog (default is '90%')
   * @param height - Height of the dialog (default is 'auto')
   * @param val - Data to pass to the dialog
   * @param minWidth - Optional minimum width
   * @param minHeight - Optional minimum height
   * @param panelClass - Optional custom CSS class for dialog panel
   * @returns MatDialogRef<any> - Reference to the opened dialog
   */
  public openDialog(content: any, width?: any, height?: any, val?: any, minWidth: any = false, minHeight: any = false, panelClass?: any): any {

    // Set default width and height if not provided
    if (width == null) width = '90%';
    if (height == null || height == false) height = 'auto';

    // Create the configuration object for dialog
    let scheme: any = {
      width: width || '400px',
      height: height || '800px',
      data: val || null,
      disableClose: true, // Prevent closing by clicking outside
      panelClass: panelClass || ''
    };

    // Optional min-width and min-height
    if (minWidth) scheme.minWidth = minWidth;
    if (minHeight) scheme.minHeight = minHeight;

    // Open the dialog with provided configuration
    this.dialogRef = this.dialog.open(content, scheme);

    return this.dialogRef;
  }

  public openDrawer(content: any, val?: any, width: string = '50vw', panelClass: any = 'global-drawer-dialog'): any {
    this.dialogRef = this.dialog.open(content, {
      width,
      maxWidth: '100vw',
      height: '100dvh',
      data: val || null,
      disableClose: false,
      autoFocus: false,
      restoreFocus: false,
      enterAnimationDuration: '200ms',
      exitAnimationDuration: '200ms',
      position: { top: '0', right: '0' },
      panelClass,
      backdropClass: 'global-drawer-backdrop'
    });

    return this.dialogRef;
  }

  /**
   * Closes the currently opened dialog
   */
  public closeModal() {
    this.dialogRef.close();
  }

  /**
   * Closes all open dialogs
   */
  public CloseALL() {
    this.dialog.closeAll();
    console.log("All Dialog box was closed");
  }

  /**
   * Opens a snackbar with a message and optional action label
   * @param message - The message to show
   * @param action - Label for the snackbar button (default is "OK")
   */
  public openSnackBar(message: string, action: string = "OK") {
    this._snackBar.open(message, action, {
      duration: 5000, // Show for 5 seconds
    });
  }

  /**
   * Example method to show a confirmation dialog
   * Uncomment and modify based on your component
   */
  public openConfirmation(message: any = false, title: any = "Confirmation") {
    return this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: title,
        message: message ? message : "Do you wish?",
      },
    });
  }

  public confirmationBox(message: any = false, title: any = "Confirmation") {
    return this.openConfirmation(message, title);
  }

  public buildDeleteConfirmationMessage(plan: any, preview: any): string {
    const deleteList: any[] = preview?.services_to_delete || [];
    const updateList: any[] = preview?.services_to_update || [];

    if (deleteList.length > 0) {
      const names = deleteList.map(s => s.name).join(', ');
      return `"${names}" feature will be deleted`;
    }

    if (updateList.length > 0) {
      const names = updateList.map(s => s.name).join(', ');
      return `"${plan.name}" plan will be removed from ${names} feature`;
    }

    // both null / empty -> fallback to the original default confirmation
    return `Delete "${plan.name}"?`;
  }

  /**
   * Example method to show an error dialog
   * Uncomment and modify based on your component
   */
  // public openErrorPopup(message: any = false) {
  //   return this.dialog.open(ErrorDialogComponent, {
  //     data: {
  //       message: message ? message : "Something went wrong.",
  //     },
  //   });
  // }
}
