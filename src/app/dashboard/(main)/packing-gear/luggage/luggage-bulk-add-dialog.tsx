'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { GearBulkAddDialog } from '../_components/gear-bulk-add-dialog';
import { createLuggage, scanLuggageImage } from './_data/api';
import { luggageKeys } from './_data/queries';

interface LuggageDraft {
	name: string;
	quantity: number;
}

export function LuggageBulkAddDialog() {
	return (
		<GearBulkAddDialog<LuggageDraft>
			noun="bag"
			nounPlural="bags"
			triggerTestId="luggage-bulk-add-trigger"
			dialogTestId="luggage-bulk-add-dialog"
			invalidateKey={luggageKeys.luggage}
			newDraft={() => ({ name: '', quantity: 1 })}
			isReady={(d) => !!d.name.trim()}
			createItem={(d, imageKey) =>
				createLuggage({
					name: d.name.trim(),
					quantity: d.quantity,
					imageKey: imageKey ?? null,
				})
			}
			scanItem={async (imageKey) => {
				const res = await scanLuggageImage(imageKey);
				return { suggestion: res.suggestion as Record<string, unknown> | null };
			}}
			applySuggestion={(d, s) => ({
				name: typeof s?.name === 'string' ? s.name : '',
				quantity: d.quantity,
			})}
			renderFields={({ draft, patch, disabled, idBase }) => (
				<>
					<div className="flex flex-col gap-1 sm:col-span-2">
						<Label htmlFor={`${idBase}-name`} className="text-xs">
							Name
						</Label>
						<Input
							id={`${idBase}-name`}
							value={draft.name}
							disabled={disabled}
							placeholder="Name"
							data-testid="bulk-name"
							onChange={(e) => patch({ name: e.target.value })}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor={`${idBase}-qty`} className="text-xs">
							Quantity
						</Label>
						<Input
							id={`${idBase}-qty`}
							type="number"
							min={1}
							value={draft.quantity}
							disabled={disabled}
							data-testid="bulk-quantity"
							onChange={(e) =>
								patch({
									quantity:
										e.target.value === ''
											? 1
											: Math.max(1, Math.trunc(+e.target.value)),
								})
							}
						/>
					</div>
				</>
			)}
		/>
	);
}
