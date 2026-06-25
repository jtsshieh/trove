'use client';

import { format } from 'date-fns';
import * as fuzzysort from 'fuzzysort';
import {
	Box,
	ChevronLeft,
	ChevronRight,
	LucideIcon,
	LuggageIcon,
	PillBottle,
	Shirt,
} from 'lucide-react';
import React, {
	ReactNode,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchResult } from './types';

interface SearchViewProps {
	searchResults: SearchResult[];
}

function getArrayOrFallback(arr: ReactNode[], fallback?: string) {
	if (arr.length === 0) return fallback;
	return arr;
}

function generatePath(container?: ReactNode, luggage?: ReactNode) {
	if (container) {
		if (luggage) {
			return (
				<>
					{luggage} / {container}
				</>
			);
		} else {
			return container;
		}
	} else {
		if (luggage) {
			return luggage;
		} else {
			return <></>;
		}
	}
}

const scoreMultiplier: Record<SearchResult['type'], number> = {
	luggage: 1.2,
	container: 1.1,
	clothing: 1,
	essential: 1,
};

export function SearchView({ searchResults }: SearchViewProps) {
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');

	const results = useMemo(() => {
		return fuzzysort.go(search, searchResults, {
			threshold: 0.3,
			all: true,
			keys: [
				'name',
				'container',
				'luggage',
				'type',
				(obj) => obj.otherMatchers.join(),
			],
			scoreFn: (r) => r.score * scoreMultiplier[r.obj.type],
		});
	}, [search]);
	const [selected, setSelected] = useState<SearchResult | null>(null);
	const [hover, setHover] = useState<SearchResult | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setHover(results[0]?.obj);
	}, [results]);

	return (
		<div className="flex min-h-0 flex-1 flex-col rounded-xl bg-white">
			<input
				autoFocus
				value={searchInput}
				onChange={(e) => {
					setSearchInput(e.target.value);
					setSelected(null);
					// setSearch(e.target.value);
					startTransition(() => setSearch(e.target.value));
				}}
				placeholder="Start typing here..."
				className="w-full rounded-t-xl px-4 py-4 text-xl outline-0"
			/>
			<div className="flex min-h-0 flex-1 flex-col border-t">
				{selected ? (
					<div className="flex flex-col gap-4 overflow-y-auto p-4">
						<Button variant="ghost" onClick={() => setSelected(null)}>
							<ChevronLeft /> Go back
						</Button>
						<div className="flex flex-row items-center gap-2">
							{getSearchResultIcon(selected.type, 'large')}
							<div className="flex-1">
								<p className="text-xl font-bold">{selected.name}</p>
								<p className="text-neutral-700">
									{getSearchResultType(selected.type)}
								</p>
							</div>
						</div>
						{(selected.type === 'clothing' ||
							selected.type === 'essential' ||
							selected.type === 'container') && (
							<div className="flex flex-col">
								<p className="text-lg font-semibold">Location Information</p>
								{!selected.container && !selected.luggage && (
									<p className="text-sm text-neutral-500">
										No location information
									</p>
								)}
								{selected.container && (
									<p className="text-sm text-neutral-500">
										<span className="font-medium text-neutral-700">
											Container
										</span>
										: {selected.container}
									</p>
								)}
								{selected.luggage && (
									<p className="text-sm text-neutral-500">
										<span className="font-medium text-neutral-700">
											Luggage
										</span>
										: {selected.luggage}
									</p>
								)}
							</div>
						)}
						{(selected.type === 'clothing' ||
							selected.type === 'essential' ||
							selected.type === 'container') && (
							<div className="flex flex-col">
								<p className="text-lg font-semibold">Provision Information</p>
								{selected.clothingDay && (
									<p className="text-sm text-neutral-500">
										<span className="font-medium text-neutral-700">Day</span>:{' '}
										{format(selected.clothingDay, 'LLL dd y')}
									</p>
								)}
								{selected.essentialKind && (
									<p className="text-sm text-neutral-500">
										<span className="font-medium text-neutral-700">App</span>:{' '}
										{selected.essentialKind}
									</p>
								)}
								{selected.containerType && (
									<p className="text-sm text-neutral-500">
										<span className="font-medium text-neutral-700">
											Container Type
										</span>
										: {selected.containerType}
									</p>
								)}
							</div>
						)}
						{selected.type === 'container' && (
							<div className="flex flex-col">
								<p className="text-lg font-semibold">Inside this Container</p>

								{selected.provisionNames &&
								selected.provisionNames.length > 0 ? (
									<ul>
										{selected.provisionNames.map((name) => (
											<li className="text-sm text-neutral-500">{name}</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-neutral-500">No items inside</p>
								)}
							</div>
						)}
						{selected.type === 'luggage' && (
							<div className="flex flex-col">
								<p className="text-lg font-semibold">Inside this Luggage</p>
								{selected.containers &&
								Object.keys(selected.containers).length > 0 ? (
									Object.entries(selected.containers).map(
										([name, provisions]) => (
											<div className="">
												<p>{name}</p>
												<ul>
													{provisions.map((provision) => (
														<li className="text-sm text-neutral-500">
															{provision}
														</li>
													))}
												</ul>
											</div>
										),
									)
								) : (
									<p className="text-sm text-neutral-500">
										No containers inside
									</p>
								)}
							</div>
						)}
					</div>
				) : results.length > 0 ? (
					<div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
						{results.map((result) => {
							return (
								<SearchResultElement
									key={result.obj.id}
									icon={getSearchResultIcon(result.obj.type, 'small')}
									name={getArrayOrFallback(
										result[0].score > 0.3
											? result[0].highlight((m, i) => (
													<span
														key={i}
														className="font-bold text-sky-500 underline decoration-sky-500 decoration-2 underline-offset-4"
													>
														{m}
													</span>
												))
											: [],
										result.obj.name,
									)}
									description={generatePath(
										getArrayOrFallback(
											result[1].score > 0.3
												? result[1].highlight((m, i) => (
														<span
															key={i}
															className="font-semibold text-sky-500 underline decoration-sky-500 decoration-2 underline-offset-4"
														>
															{m}
														</span>
													))
												: [],
											result.obj.container,
										),
										getArrayOrFallback(
											result[2].score > 0.3
												? result[2].highlight((m, i) => (
														<span
															key={i}
															className="font-semibold text-sky-500 underline decoration-sky-500 decoration-2 underline-offset-4"
														>
															{m}
														</span>
													))
												: [],
											result.obj.luggage,
										),
									)}
									onMouseEnter={() => setHover(result.obj)}
									onSelect={() => setSelected(result.obj)}
									hovered={hover?.id === result.obj.id}
								/>
							);
						})}
					</div>
				) : (
					<div className="col-span-3 flex flex-1 flex-col items-center justify-center border-r p-4">
						<h3 className="text-2xl font-bold">No results found</h3>
						<p className="text-sm text-neutral-500">
							Try altering your query to find it.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function getSearchResultIcon(
	type: SearchResult['type'],
	size: 'small' | 'large',
) {
	const lookupMap: Record<SearchResult['type'], LucideIcon> = {
		clothing: Shirt,
		essential: PillBottle,
		container: Box,
		luggage: LuggageIcon,
	};
	const Comp = lookupMap[type];

	return (
		<Comp
			className={cn(size === 'small' ? 'h-7 w-7' : 'h-10 w-10')}
			strokeWidth="1.5"
		/>
	);
}

function getSearchResultType(type: SearchResult['type']) {
	const lookupMap: Record<SearchResult['type'], string> = {
		clothing: 'Clothing',
		essential: 'Essential',
		container: 'Container',
		luggage: 'Luggage',
	};

	return lookupMap[type];
}

function SearchResultElement({
	icon,
	name,
	description,
	hovered,
	onMouseEnter,
	onSelect,
}: {
	icon?: ReactNode;
	name: ReactNode;
	description: ReactNode;
	hovered: boolean;
	onMouseEnter: () => void;
	onSelect: () => void;
}) {
	return (
		<div
			className={cn(
				'group flex select-none flex-row items-center gap-2 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
				hovered && 'bg-muted text-foreground',
			)}
			onMouseEnter={onMouseEnter}
			onClick={onSelect}
		>
			{icon}
			<div className="flex-1">
				<p className="text-sm font-medium">{name}</p>
				<p
					className={cn(
						'text-xs font-normal text-neutral-400 group-hover:text-neutral-500',
						hovered && 'text-neutral-500',
					)}
				>
					{description}
				</p>
			</div>
			<ChevronRight className="h-5 w-5" />
		</div>
	);
}
