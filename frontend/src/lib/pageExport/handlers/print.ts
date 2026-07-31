import { Printer } from 'lucide-react';
import { registerPageExportHandler } from '../registry';

export const PAGE_EXPORT_PRINT_ID = 'print';

export function registerPrintPageExportHandler(): void {
  registerPageExportHandler({
    id: PAGE_EXPORT_PRINT_ID,
    label: 'Print…',
    icon: Printer,
    order: 20,
    run() {
      window.print();
    },
  });
}
