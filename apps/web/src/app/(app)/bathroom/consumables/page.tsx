import { BathroomSection } from '../_components/bathroom-section';
import { BathroomConsumablesContent } from '../page-wrapper';

export default function BathroomConsumablesPage() {
	return (
		<BathroomSection
			title="Consumables"
			subtitle="How much you have on hand — buy more or use one up as you go."
		>
			<BathroomConsumablesContent />
		</BathroomSection>
	);
}
