import { CircleAlert, CircleCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

import { getCarryOnCompliance } from '../_data/compliance';

/**
 * Carry-on liquids (TSA 3-1-1) verdict for the bathroom items packed into the
 * trip's carry-on bags. Renders nothing unless a carry-on actually carries a
 * liquid that the rule applies to.
 */
export async function LiquidsCompliancePanel({ tripId }: { tripId: string }) {
	const result = await getCarryOnCompliance(tripId);
	if (!result) return null;

	const bags = result.bags.filter((b) =>
		b.result.items.some((i) => i.status !== 'exempt'),
	);
	if (bags.length === 0) return null;

	const over = result.status === 'over';
	return (
		<section
			data-testid="liquids-compliance"
			data-status={result.status}
			className={cn(
				'mb-4 rounded-xl border p-4',
				over
					? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
					: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
			)}
		>
			<div className="mb-1.5 flex items-center gap-2">
				{over ? (
					<CircleAlert className="size-4" />
				) : (
					<CircleCheck className="size-4" />
				)}
				<h2 className="text-sm font-semibold">Carry-on liquids (TSA 3-1-1)</h2>
			</div>
			<div className="flex flex-col gap-1.5 text-sm">
				{bags.map((b) => (
					<div key={b.luggageProvisionId}>
						<p className="font-medium">
							{b.luggageName}:{' '}
							{b.result.status === 'over' ? 'over the limit' : 'compliant'}
						</p>
						{b.result.violations.map((v) => (
							<p key={v} className="text-red-700 dark:text-red-300">
								• {v}
							</p>
						))}
					</div>
				))}
			</div>
		</section>
	);
}
