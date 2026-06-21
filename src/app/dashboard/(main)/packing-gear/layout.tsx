import { PropsWithChildren } from 'react';

import { PackingGearNav } from './packing-gear-nav';

export default function PackingGearLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
					<h1 className="text-2xl font-bold sm:text-3xl">Packing Gear</h1>
					<PackingGearNav />
				</div>
				{children}
			</div>
		</div>
	);
}
