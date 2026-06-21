'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { containersQueryOptions } from './_data/queries';
import { ContainerBulkAddDialog } from './container-bulk-add-dialog';
import { CreateContainerDialog } from './container-dialogs';
import { ContainerList } from './container-list';

export function ContainerWrapper() {
	const { data: containers } = useSuspenseQuery(containersQueryOptions);

	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<p className="text-base text-neutral-600">
						Containers are smaller containers, like packing cubes or toiletry
						bags, that are packed in luggage.
					</p>
				</div>
				<div className="flex gap-2">
					<ContainerBulkAddDialog />
					<CreateContainerDialog />
				</div>
			</div>
			<ContainerList containers={containers} />
		</>
	);
}
