'use client';

import type { Luggage } from '@/generated/prisma/client';
import { ChevronsUpDown, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useAppForm,
} from '@/components/ui/form';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemDisplay } from '@/components/ui/item-display';
import { cn } from '@/lib/utils';

import { useCreateLuggageProvision } from '../_data/mutations';
import { createLuggageProvisionSchema } from '../_data/schemas';

/** A catalog suitcase with how many units are still free to add to this trip. */
type AvailableLuggage = Luggage & { remaining: number };

/**
 * Adds a suitcase from the user's wardrobe to this trip. `luggage` is already
 * filtered to suitcases the user still has free units of, so an empty list means
 * "all added". For a multi-owned suitcase you can pick how many to add, each
 * becoming its own card.
 */
export function CreateSuitcaseDialog({
	tripId,
	luggage,
}: {
	tripId: string;
	luggage: AvailableLuggage[];
}) {
	const [open, setOpen] = useState(false);
	const [comboOpen, setComboOpen] = useState(false);
	const [count, setCount] = useState(1);
	const createProvision = useCreateLuggageProvision(tripId);
	const isPending = createProvision.isPending;

	const form = useAppForm({
		schema: createLuggageProvisionSchema,
		defaultValues: { luggageId: '' },
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createProvision.mutateAsync({ ...data, count });
			form.reset();
			setCount(1);
			setOpen(false);
		} catch {
			// The mutation hook surfaces the error toast.
		}
	});

	const selected = luggage.find((l) => l.id === form.watch('luggageId'));
	const remaining = selected?.remaining ?? 1;
	const stepCount = (delta: number) =>
		setCount((c) => Math.max(1, Math.min(remaining, c + delta)));

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					form.reset();
					setCount(1);
				}
				setOpen(next);
			}}
		>
			<DialogTrigger
				render={<Button variant="brand" className="gap-1.5" />}
				disabled={luggage.length === 0}
			>
				<Plus />
				Add suitcase
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-6">
						<DialogHeader>
							<DialogTitle>Add a suitcase</DialogTitle>
							<DialogDescription>
								Bring one of your suitcases on this trip, then drag containers
								into it to plan how everything is packed.
							</DialogDescription>
						</DialogHeader>
						<FormField
							control={form.control}
							name="luggageId"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Suitcase</FormLabel>
									<Popover open={comboOpen} onOpenChange={setComboOpen}>
										<PopoverTrigger render={<FormControl />}>
											<Button
												disabled={isPending}
												variant="outline"
												role="combobox"
												className={cn(
													'h-auto justify-between py-1.5',
													!field.value && 'text-muted-foreground',
												)}
											>
												{selected ? (
													<ItemDisplay
														name={selected.name}
														imageKey={selected.imageKey}
													/>
												) : (
													'Select a suitcase to add'
												)}
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[--radix-popover-trigger-width] p-0"
											align="start"
										>
											<Command>
												<CommandInput placeholder="Search your suitcases..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>No suitcases found.</CommandEmpty>
														{luggage.map((lug) => (
															<CommandItem
																value={lug.name}
																key={lug.id}
																onSelect={() => {
																	form.setValue('luggageId', lug.id);
																	setCount(1);
																	setComboOpen(false);
																}}
															>
																<ItemDisplay
																	name={lug.name}
																	imageKey={lug.imageKey}
																/>
															</CommandItem>
														))}
													</CommandList>
												</ScrollArea>
											</Command>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
						{selected && remaining > 1 && (
							<div
								className="flex items-center gap-2 text-sm"
								data-testid="suitcase-qty"
								data-name={selected.name}
							>
								<span className="min-w-0 flex-1 truncate">How many?</span>
								<span className="text-muted-foreground text-xs">
									{remaining} owned free
								</span>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										size="icon-xs"
										variant="ghost"
										aria-label="Add one fewer"
										disabled={count <= 1}
										onClick={() => stepCount(-1)}
									>
										<Minus />
									</Button>
									<span
										data-testid="suitcase-qty-value"
										className="w-6 text-center text-sm font-semibold tabular-nums"
									>
										{count}
									</span>
									<Button
										type="button"
										size="icon-xs"
										variant="ghost"
										aria-label="Add one more"
										disabled={count >= remaining}
										onClick={() => stepCount(1)}
									>
										<Plus />
									</Button>
								</div>
							</div>
						)}
						<DialogFooter>
							<Button type="submit" variant="brand" loading={isPending}>
								Add{count > 1 ? ` ${count} suitcases` : ' suitcase'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
