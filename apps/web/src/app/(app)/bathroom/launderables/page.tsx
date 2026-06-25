import { BathroomSection } from '../_components/bathroom-section';
import { BathroomLaunderablesContent } from '../page-wrapper';

export default function BathroomLaunderablesPage() {
	return (
		<BathroomSection
			title="Launderables"
			subtitle="Your reusable washables — buy units and run them through the clean / dirty cycle."
		>
			<BathroomLaunderablesContent />
		</BathroomSection>
	);
}
