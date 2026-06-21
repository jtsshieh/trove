'use client';

import { ContainerType } from '@/generated/prisma/enums';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

import { GearBulkAddDialog } from '../_components/gear-bulk-add-dialog';
import { createContainer, scanContainerImage } from './_data/api';
import { containerKeys } from './_data/queries';

interface ContainerDraft {
	name: string;
	type: ContainerType | null;
	quantity: number;
}

const TYPES = [ContainerType.Clothes, ContainerType.Essentials];

export function ContainerBulkAddDialog() {
	return (
		<GearBulkAddDialog<ContainerDraft>
			noun="container"
			nounPlural="containers"
			triggerTestId="container-bulk-add-trigger"
			dialogTestId="container-bulk-add-dialog"
			invalidateKey={containerKeys.all}
			newDraft={() => ({ name: '', type: null, quantity: 1 })}
			isReady={(d) => !!d.name.trim() && !!d.type}
			createItem={(d, imageKey) =>
				createContainer({
					name: d.name.trim(),
					type: d.type!,
					quantity: d.quantity,
					imageKey: imageKey ?? null,
				})
			}
			scanItem={async (imageKey) => {
				const res = await scanContainerImage(imageKey);
				return { suggestion: res.suggestion as Record<string, unknown> | null };
			}}
			applySuggestion={(d, s) => {
				const type = s?.type;
				return {
					name: typeof s?.name === 'string' ? s.name : '',
					type:
						type === ContainerType.Clothes || type === ContainerType.Essentials
							? (type as ContainerType)
							: null,
					quantity: d.quantity,
				};
			}}
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
						<Label htmlFor={`${idBase}-type`} className="text-xs">
							Type
						</Label>
						<Select
							value={draft.type ?? null}
							onValueChange={(v) => patch({ type: (v as ContainerType) ?? null })}
							disabled={disabled}
						>
							<SelectTrigger id={`${idBase}-type`} size="sm" data-testid="bulk-type">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								{TYPES.map((t) => (
									<SelectItem key={t} value={t}>
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
