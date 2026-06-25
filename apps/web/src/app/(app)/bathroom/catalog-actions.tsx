'use client';

import { CreateBathroomProductDialog } from './bathroom-product-dialogs';
import { BathroomTypeManagerDialog } from './bathroom-type-manager';
import { BulkAddBathroomDialog } from './bulk-add-bathroom-dialog';

/** The Catalog header controls: manage types, bulk add, and add a single product. */
export function CatalogActions() {
	return (
		<>
			<BathroomTypeManagerDialog />
			<BulkAddBathroomDialog />
			<CreateBathroomProductDialog />
		</>
	);
}
