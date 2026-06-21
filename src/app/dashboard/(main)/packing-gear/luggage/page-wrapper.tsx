'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { luggageQueryOptions } from './_data/queries';
import { LuggageBulkAddDialog } from './luggage-bulk-add-dialog';
import { CreateLuggageDialog } from './luggage-dialogs';
import { LuggageList } from './luggage-list';

export function LuggageContent() {
	const { data: luggage } = useSuspenseQuery(luggageQueryOptions);

	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<p className="text-base text-neutral-600">
						Luggage include any large bags that you bring on a trip like
						suitcases and backpacks.
					</p>
				</div>
				<div className="flex gap-2">
					<LuggageBulkAddDialog />
					<CreateLuggageDialog />
				</div>
			</div>
			<LuggageList luggage={luggage} />
		</>
	);
}
