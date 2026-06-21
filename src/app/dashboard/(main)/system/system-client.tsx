'use client';

import { useQuery } from '@tanstack/react-query';
import {
	AlertTriangle,
	ArrowDownToLine,
	CheckCircle2,
	GitCommitHorizontal,
	Loader2,
	RefreshCw,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useCheckForUpdate, useTriggerUpdate } from './_data/mutations';
import { systemStatusQueryOptions } from './_data/queries';
import type { UpdateCheck } from './_data/schemas';

export function SystemClient() {
	const statusQuery = useQuery({
		...systemStatusQueryOptions,
		// Poll only while an update is running; otherwise read on demand. Polling must
		// survive the app restarting mid-update, so keep firing on the interval.
		refetchInterval: (query) =>
			query.state.data?.state === 'updating' ? 2000 : false,
		refetchIntervalInBackground: true,
		retry: false,
	});
	const status = statusQuery.data;
	const check = useCheckForUpdate();
	const update = useTriggerUpdate();
	const [checkResult, setCheckResult] = useState<UpdateCheck | null>(null);

	const isUpdating = status?.state === 'updating';

	// Toast on the updating -> idle/error transition (covers the app restarting and
	// the page reconnecting to a finished update).
	const prevStage = useRef<string | undefined>(undefined);
	useEffect(() => {
		const stage = status?.state;
		if (prevStage.current === 'updating' && stage === 'idle') {
			toast.success('Update complete — now running the latest version.');
			setCheckResult(null);
		} else if (prevStage.current === 'updating' && stage === 'error') {
			toast.error('Update failed — see the log below.');
		}
		prevStage.current = stage;
	}, [status?.state]);

	if (statusQuery.isLoading) {
		return (
			<div className="flex items-center gap-2 text-neutral-600">
				<Loader2 className="size-4 animate-spin" /> Loading status…
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Current version</CardTitle>
					<CardDescription>
						The commit this server is currently running, on branch{' '}
						<span className="font-mono">{status?.branch}</span>.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<GitCommitHorizontal className="size-5 text-neutral-500" />
						<span className="font-mono text-sm">
							{status?.current.shaShort || '—'}
						</span>
						<span className="text-neutral-700">{status?.current.subject}</span>
					</div>
				</CardContent>
				<CardFooter className="flex justify-end bg-neutral-100 py-4">
					<Button
						variant="secondary"
						onClick={() =>
							check.mutate(undefined, { onSuccess: setCheckResult })
						}
						loading={check.isPending}
						disabled={isUpdating}
					>
						<RefreshCw className="size-4" /> Check for updates
					</Button>
				</CardFooter>
			</Card>

			{checkResult && !isUpdating && (
				<Card>
					<CardHeader>
						<CardTitle>
							{checkResult.updateAvailable ? (
								<span className="flex items-center gap-2">
									<ArrowDownToLine className="text-brand size-5" />
									Update available
								</span>
							) : (
								<span className="flex items-center gap-2">
									<CheckCircle2 className="size-5 text-green-600" />
									Up to date
								</span>
							)}
						</CardTitle>
						<CardDescription>
							{checkResult.updateAvailable
								? `${checkResult.behindBy} new commit${
										checkResult.behindBy === 1 ? '' : 's'
									} (${checkResult.currentShaShort} → ${checkResult.latestShaShort}).`
								: "You're running the latest commit."}
						</CardDescription>
					</CardHeader>
					{checkResult.updateAvailable && (
						<>
							<CardContent>
								<ul className="flex flex-col gap-1">
									{checkResult.changelog.map((c) => (
										<li
											key={c.sha}
											className="flex items-baseline gap-2 text-sm"
										>
											<span className="font-mono text-neutral-500">
												{c.sha}
											</span>
											<span className="text-neutral-700">{c.subject}</span>
										</li>
									))}
								</ul>
							</CardContent>
							<CardFooter className="flex justify-end bg-neutral-100 py-4">
								<Button
									onClick={() => update.mutate()}
									loading={update.isPending || isUpdating}
								>
									<ArrowDownToLine className="size-4" /> Update &amp; restart
								</Button>
							</CardFooter>
						</>
					)}
				</Card>
			)}

			{(isUpdating ||
				status?.state === 'error' ||
				(status?.log.length ?? 0) > 0) && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{isUpdating ? (
								<>
									<Loader2 className="text-brand size-5 animate-spin" />{' '}
									Updating…
								</>
							) : status?.state === 'error' ? (
								<>
									<AlertTriangle className="size-5 text-red-600" /> Update
									failed
								</>
							) : (
								'Last update log'
							)}
						</CardTitle>
						{isUpdating && (
							<CardDescription>
								The app will restart partway through — this page will reconnect
								automatically when it&apos;s back.
							</CardDescription>
						)}
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-64 rounded-md border bg-neutral-950">
							<pre className="p-3 font-mono text-xs leading-relaxed text-neutral-100">
								{status?.log.join('\n') || 'No output yet.'}
							</pre>
						</ScrollArea>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
