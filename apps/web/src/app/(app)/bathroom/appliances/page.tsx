import { BathroomSection } from '../_components/bathroom-section';
import { BathroomAppliancesContent } from '../page-wrapper';

export default function BathroomAppliancesPage() {
	return (
		<BathroomSection
			title="Appliances"
			subtitle="Your durable devices — buy units and check them in and out."
		>
			<BathroomAppliancesContent />
		</BathroomSection>
	);
}
