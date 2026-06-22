import { PropsWithChildren } from 'react';

import { PackingGearNav } from './packing-gear-nav';

export default function PackingGearLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex flex-col gap-1 border-b pb-4">
					<h1 className="text-3xl font-bold">Packing Gear</h1>
					<h2 className="text-base text-neutral-600">
						Your luggage and the containers you pack into.
					</h2>
				</div>
				<PackingGearNav />
				<div className="mt-4 flex flex-1 flex-col">{children}</div>
			</div>
		</div>
	);
}
