import { BathroomSection } from '../_components/bathroom-section';
import { CatalogActions } from '../catalog-actions';
import { BathroomCatalogContent } from '../page-wrapper';

export default function BathroomCatalogPage() {
	return (
		<BathroomSection
			title="Catalog"
			subtitle="Define your bathroom products and their variations — add, edit, and delete items here."
			actions={<CatalogActions />}
		>
			<BathroomCatalogContent />
		</BathroomSection>
	);
}
