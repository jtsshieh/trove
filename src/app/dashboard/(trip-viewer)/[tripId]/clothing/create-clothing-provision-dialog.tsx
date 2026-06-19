'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Clothing, ClothingType, Trip } from '@/generated/prisma/client';
import { format } from 'date-fns';
import { CalendarIcon, ChevronsUpDown, Plus, RefreshCcw } from 'lucide-react';
import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Dialog,
	DialogContent,
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
} from '@/components/ui/form';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { cn } from '@/lib/utils';

import { createClothingProvision } from './_data/actions';
import { createClothingProvisionSchema } from './_data/schemas';

interface CreateClothingProvisionDialogProps {
	trip: Trip;
	clothes: Clothing[];
	types: ClothingType[];
	usedClothes: string[];
}
export function CreateClothingProvisionDialog({
	trip,
	clothes,
	types,
	usedClothes,
}: CreateClothingProvisionDialogProps) {
	const [open, setOpen] = useState(false);

	const [calendarOpen, setCalendarOpen] = useState(false);
	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof createClothingProvisionSchema>>({
		resolver: zodResolver(createClothingProvisionSchema),
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createClothingProvision(trip.id, data);
			form.reset();
			setOpen(false);
		}),
	);

	const clothingGroups: Record<string, Clothing[]> = {};
	types.forEach((type) => {
		clothingGroups[type.name] = [];
	});

	clothes.forEach((clothing) => {
		clothingGroups[clothing.typeName].push(clothing);
	});
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset();
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger
				render={
					<Button size="icon" className="gap-1 md:w-auto md:px-4 md:py-2" />
				}
			>
				<Plus />
				<span className="hidden md:block">Add Provision</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add Clothing Provision</DialogTitle>
						</DialogHeader>

						<FormField
							control={form.control}
							name="day"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Day</FormLabel>
									<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
										<PopoverTrigger render={<FormControl />}>
											<Button
												disabled={isPending}
												variant={'outline'}
												className={cn(
													'pl-3 text-left font-normal',
													!field.value && 'text-neutral-600',
												)}
											>
												{field?.value ? (
													format(field.value, 'LLL dd, y')
												) : (
													<span>Pick a date</span>
												)}
												<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												defaultMonth={trip.start}
												selected={field.value}
												onSelect={(e) => {
													field.onChange(e);
													setCalendarOpen(false);
													setComboOpen(true);
													form.setFocus('clothing');
												}}
												disabled={[{ before: trip.start }, { after: trip.end }]}
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="clothing"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Clothing</FormLabel>
									<Popover open={comboOpen} onOpenChange={setComboOpen}>
										<PopoverTrigger render={<FormControl />}>
											<Button
												disabled={isPending}
												variant="outline"
												role="combobox"
												className={cn(
													'flex justify-between',
													!field.value && 'text-neutral-600',
												)}
											>
												{field.value
													? generateClothingName(
															Object.values(clothingGroups)
																.flatMap((group) => group)
																.find(
																	(clothing) => clothing.id === field.value,
																) as Clothing,
														)
													: 'Select piece of clothing'}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[--radix-popover-trigger-width] p-0"
											align="start"
										>
											<Command>
												<CommandInput placeholder="Search your wardrobe..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>No clothing found.</CommandEmpty>

														{Object.entries(clothingGroups).map(
															([type, clothes]) => (
																<CommandGroup key={type} heading={type}>
																	{clothes.map((clothing) => (
																		<CommandItem
																			value={generateClothingName(clothing)}
																			key={clothing.id}
																			onSelect={() => {
																				form.setValue('clothing', clothing.id);
																				setComboOpen(false);
																			}}
																		>
																			{generateClothingName(clothing)}
																			{usedClothes.includes(clothing.id) && (
																				<RefreshCcw
																					size={16}
																					className="ml-2"
																				/>
																			)}
																		</CommandItem>
																	))}
																</CommandGroup>
															),
														)}
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
							<Button type="submit" loading={isPending}>
								Add Provision
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
