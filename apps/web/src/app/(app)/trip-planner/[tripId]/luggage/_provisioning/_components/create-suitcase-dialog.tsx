'use client';

import type { Luggage } from '@/generated/prisma/client';
import { ChevronsUpDown, Plus } from 'lucide-react';
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

/**
 * Adds a suitcase from the user's wardrobe to this trip. `luggage` is already
 * filtered to suitcases not yet provisioned, so an empty list means "all added".
 */
export function CreateSuitcaseDialog({
	tripId,
	luggage,
}: {
	tripId: string;
	luggage: Luggage[];
}) {
	const [open, setOpen] = useState(false);
	const [comboOpen, setComboOpen] = useState(false);
	const createProvision = useCreateLuggageProvision(tripId);
	const isPending = createProvision.isPending;

	const form = useAppForm({
		schema: createLuggageProvisionSchema,
		defaultValues: { luggageId: '' },
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createProvision.mutateAsync(data);
			form.reset();
			setOpen(false);
		} catch {
			// The mutation hook surfaces the error toast.
		}
	});

	const selected = luggage.find((l) => l.id === form.watch('luggageId'));

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) form.reset();
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
						<DialogFooter>
							<Button type="submit" variant="brand" loading={isPending}>
								Add suitcase
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
