import React from 'react';

import { SystemClient } from './system-client';

// Access is gated by the Admin layout (requireAdminPage).
export default function SystemPage() {
	return (
		<div className="mx-auto w-full max-w-screen-md">
			<div className="mb-4 flex flex-col gap-1">
				<h1 className="text-3xl font-bold">System</h1>
				<h2 className="text-base text-neutral-600">
					Check for and apply updates to this server.
				</h2>
			</div>
			<SystemClient />
		</div>
	);
}
