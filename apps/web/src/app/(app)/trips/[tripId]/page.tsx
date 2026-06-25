import { ContainerType, TripMode } from '@/generated/prisma/enums';
import {
	differenceInCalendarDays,
	eachDayOfInterval,
	format,
	isSameDay,
} from 'date-fns';
import {
	ArrowRight,
	Box,
	CalendarRange,
	Home,
	Luggage,
	PillBottle,
	Shirt,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import { ItemDisplay } from '@/components/ui/item-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { cn } from '@/lib/utils';

import { TripPageHeader } from './_components/trip-page-header';
import { resolveEssentialItem } from './_data/essential-item';
import { getTripOverview, type TripOverview } from './_data/fetchers';

export default async function TripPage(props: {
	params: Promise<{ tripId: string }>;
}) {
	const { tripId } = await props.params;

	return (
		<Suspense fallback={<OverviewSkeleton />}>
			<Overview tripId={tripId} />
		</Suspense>
	);
}

async function Overview({ tripId }: { tripId: string }) {
	const trip = await getTripOverview(tripId);
	if (!trip) return notFound();

	const nights = Math.max(0, differenceInCalendarDays(trip.end, trip.start));
	const dateRange = `${format(trip.start, 'EEE, LLL d')} – ${format(
		trip.end,
		'EEE, LLL d, yyyy',
	)}`;

	const next = nextStep(trip.mode, tripId);

	return (
		<>
			<TripPageHeader
				icon={<Home />}
				title={trip.name}
				description={`${dateRange} · ${nights} ${nights === 1 ? 'night' : 'nights'}`}
				actions={
					next && (
						<Button
							variant="brand"
							nativeButton={false}
							render={<Link href={next.href} />}
						>
							{next.label}
							<ArrowRight />
						</Button>
					)
				}
			/>

			<div className="flex flex-col gap-8">
				<ProgressSection trip={trip} />
				<DayAtAGlance trip={trip} />
				<QuickLinks trip={trip} />
			</div>
		</>
	);
}

/* ------------------------------------------------------------------ progress */

function ProgressSection({ trip }: { trip: TripOverview }) {
	const stats = deriveStats(trip);

	return (
		<section>
			<Card>
				<CardHeader className="gap-3">
					<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
						<CardTitle className="text-base">Packing progress</CardTitle>
						<span className="text-muted-foreground text-sm tabular-nums">
							<span className="text-foreground font-semibold">
								{stats.packed}
							</span>{' '}
							/ {stats.total} items packed
						</span>
					</div>
					<Progress value={stats.percent} className="h-2" />
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{stats.areas.map((area) => (
						<StatTile key={area.label} {...area} />
					))}
				</CardContent>
			</Card>
		</section>
	);
}

function StatTile({
	icon,
	label,
	count,
	packed,
}: {
	icon: React.ReactNode;
	label: string;
	count: number;
	packed: number;
}) {
	const complete = count > 0 && packed === count;
	return (
		<div className="bg-surface-sunken flex items-center gap-3 rounded-lg p-3">
			<span
				className={cn(
					'flex size-9 shrink-0 items-center justify-center rounded-lg bg-panel text-panel-foreground [&_svg]:size-4.5',
					complete && 'bg-brand-subtle text-brand',
				)}
			>
				{icon}
			</span>
			<div className="min-w-0">
				<p className="text-2xl leading-none font-semibold tabular-nums">
					{count}
				</p>
				<p className="text-muted-foreground truncate text-xs">
					{label}
					{count > 0 && (
						<span className="tabular-nums"> · {packed} packed</span>
					)}
				</p>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------- day at glance */

function DayAtAGlance({ trip }: { trip: TripOverview }) {
	const days = eachDayOfInterval({ start: trip.start, end: trip.end });

	const noteFor = (day: Date) =>
		trip.dayNotes.find((n) => isSameDay(n.day, day))?.note;
	const clothingFor = (day: Date) =>
		trip.clothingProvisions.filter((p) => p.day && isSameDay(p.day, day));
	const essentialsFor = (day: Date) =>
		trip.essentialProvisions.filter((p) => p.day && isSameDay(p.day, day));

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<CalendarRange className="text-muted-foreground size-4" />
				<h2 className="text-sm font-semibold">Day at a glance</h2>
			</div>

			<div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-4 pb-1">
				{days.map((day) => {
					const clothing = clothingFor(day);
					const essentials = essentialsFor(day);
					const note = noteFor(day);
					const empty = clothing.length === 0 && essentials.length === 0;

					return (
						<Card
							key={day.toISOString()}
							size="sm"
							className="w-56 shrink-0 snap-start"
						>
							<CardHeader className="gap-0.5">
								<p className="text-muted-foreground text-xs font-medium uppercase">
									{format(day, 'EEE')}
								</p>
								<CardTitle className="text-sm">
									{format(day, 'LLL d')}
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-2">
								{empty ? (
									<p className="bg-surface-sunken text-muted-foreground rounded-md px-2.5 py-3 text-center text-xs">
										Nothing planned
									</p>
								) : (
									<>
										{clothing.slice(0, 3).map((p) => (
											<ItemDisplay
												key={p.id}
												size="chip"
												name={generateClothingName(p.clothing)}
												imageKey={p.clothing.imageKey}
												fallbackIcon={<Shirt />}
											/>
										))}
										{essentials.slice(0, 2).map((p) => {
											const item = resolveEssentialItem(p);
											return (
												<ItemDisplay
													key={p.id}
													size="chip"
													name={item.name}
													imageKey={item.imageKey}
													fallbackIcon={<PillBottle />}
												/>
											);
										})}
										{clothing.length + essentials.length > 5 && (
											<p className="text-muted-foreground px-0.5 text-xs tabular-nums">
												+{clothing.length + essentials.length - 5} more
											</p>
										)}
									</>
								)}
								{note && (
									<p className="bg-brand-subtle text-foreground/80 mt-0.5 line-clamp-2 rounded-md px-2.5 py-1.5 text-xs">
										{note}
									</p>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</section>
	);
}

/* ---------------------------------------------------------------- quick links */

function QuickLinks({ trip }: { trip: TripOverview }) {
	const links = quickLinks(trip);
	if (links.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold">Jump back in</h2>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{links.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						className="group/link bg-card ring-foreground/10 hover-hover:hover:ring-ring-brand focus-visible:ring-ring-brand flex items-center gap-3 rounded-xl p-4 ring-1 transition-[transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none focus-visible:ring-2 motion-safe:active:scale-[0.98]"
					>
						<span className="bg-panel text-panel-foreground group-hover/link:bg-brand-subtle group-hover/link:text-brand flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-[var(--dur-fast)] [&_svg]:size-5">
							{link.icon}
						</span>
						<div className="min-w-0 flex-1">
							<p className="font-medium">{link.label}</p>
							<p className="text-muted-foreground truncate text-xs">
								{link.description}
							</p>
						</div>
						<ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] motion-safe:group-hover/link:translate-x-0.5" />
					</Link>
				))}
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------- helpers */

function deriveStats(trip: TripOverview) {
	const clothing = trip.clothingProvisions;
	const essentials = trip.essentialProvisions;

	const containerPacked = trip.containerProvisions.reduce((acc, cp) => {
		const items =
			cp.container.type === ContainerType.Clothes
				? cp.clothingProvisions
				: cp.essentialProvisions;
		return acc + (items.length > 0 && items.every((i) => i.packed) ? 1 : 0);
	}, 0);

	const luggagePacked = trip.luggageProvisions.reduce((acc, lp) => {
		const items = lp.containerProvisions;
		return acc + (items.length > 0 && items.every((i) => i.packed) ? 1 : 0);
	}, 0);

	const areas = [
		{
			icon: <Shirt />,
			label: 'Clothing',
			count: clothing.length,
			packed: clothing.filter((p) => p.packed).length,
		},
		{
			icon: <PillBottle />,
			label: 'Essentials',
			count: essentials.length,
			packed: essentials.filter((p) => p.packed).length,
		},
		{
			icon: <Box />,
			label: 'Containers',
			count: trip.containerProvisions.length,
			packed: containerPacked,
		},
		{
			icon: <Luggage />,
			label: 'Luggage',
			count: trip.luggageProvisions.length,
			packed: luggagePacked,
		},
	];

	const total = clothing.length + essentials.length;
	const packed =
		clothing.filter((p) => p.packed).length +
		essentials.filter((p) => p.packed).length;

	return {
		areas,
		total,
		packed,
		percent: total === 0 ? 0 : (packed / total) * 100,
	};
}

function nextStep(
	mode: TripMode,
	tripId: string,
): { label: string; href: Route } | null {
	const base = `/trips/${tripId}`;
	switch (mode) {
		case TripMode.Provision:
			return { label: 'Plan clothing', href: `${base}/clothing` as Route };
		case TripMode.Pack:
			return { label: 'Start packing', href: `${base}/containers` as Route };
		case TripMode.Audit:
			return { label: 'Audit items', href: `${base}/search` as Route };
		default:
			return null;
	}
}

function quickLinks(trip: TripOverview) {
	const base = `/trips/${trip.id}`;
	const all: {
		mode: TripMode[];
		icon: React.ReactNode;
		label: string;
		description: string;
		href: Route;
	}[] = [
		{
			mode: [TripMode.Provision],
			icon: <Shirt />,
			label: 'Clothing',
			description: 'Plan outfits day by day',
			href: `${base}/clothing` as Route,
		},
		{
			mode: [TripMode.Provision],
			icon: <PillBottle />,
			label: 'Essentials',
			description: 'Toiletries, meds & must-haves',
			href: `${base}/essentials` as Route,
		},
		{
			mode: [TripMode.Provision, TripMode.Pack],
			icon: <Box />,
			label: 'Containers',
			description: 'Organize items into containers',
			href: `${base}/containers` as Route,
		},
		{
			mode: [TripMode.Provision, TripMode.Pack],
			icon: <Luggage />,
			label: 'Luggage',
			description: 'Pack containers into your bags',
			href: `${base}/luggage` as Route,
		},
	];
	return all.filter((l) => l.mode.includes(trip.mode));
}

/* ----------------------------------------------------------------- skeletons */

function OverviewSkeleton() {
	return (
		<>
			<TripPageHeader
				icon={<Home />}
				title={<Skeleton className="h-6 w-44" />}
				description={<Skeleton className="mt-1 h-4 w-56" />}
			/>
			<div className="flex flex-col gap-8">
				<Skeleton className="h-44 w-full rounded-xl" />
				<div className="flex gap-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-40 w-56 shrink-0 rounded-xl" />
					))}
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-[74px] w-full rounded-xl" />
					))}
				</div>
			</div>
		</>
	);
}
