'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Essential, Trip } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';
import { ChevronsUpDown, Plus } from 'lucide-react';
import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

import { createEssentialProvision } from './_data/actions';
import { createEssentialProvisionSchema } from './_data/schemas';

interface CreateEssentialProvisionDialogProps {
	trip: Trip;
	essentials: Essential[];
	usedEssentials: string[];
}
export function CreateEssentialProvisionDialog({
	trip,
	essentials,
	usedEssentials,
}: CreateEssentialProvisionDialogProps) {
	const [open, setOpen] = useState(false);
	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof createEssentialProvisionSchema>>({
		resolver: zodResolver(createEssentialProvisionSchema),
	});
	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createEssentialProvision(trip.id, data);
			form.reset();
			setOpen(false);
		}),
	);
	const groups: Record<EssentialCategory, Essential[]> = {
		[EssentialCategory.Toiletry]: [],
		[EssentialCategory.Document]: [],
		[EssentialCategory.Electronic]: [],
	};
	essentials.forEach((essential) => {
		groups[essential.category].push(essential);
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
							<DialogTitle>Add Essential Provision</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="id"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Essential</FormLabel>
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
													? (
															Object.values(groups)
																.flatMap((category) => category)
																.find(
																	(essential) => essential.id === field.value,
																) as Essential
														).name
													: "Select the essential you'd like to add"}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[--radix-popover-trigger-width] p-0"
											align="start"
										>
											<Command>
												<CommandInput placeholder="Search your essentials..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>No essentials found.</CommandEmpty>
														{Object.entries(groups).map(
															([category, essentials]) => (
																<CommandGroup key={category} heading={category}>
																	{essentials
																		.filter(
																			(essential) =>
																				!usedEssentials.includes(essential.id),
																		)
																		.map((essential) => (
																			<CommandItem
																				value={essential.name}
																				key={essential.id}
																				onSelect={() => {
																					form.setValue('id', essential.id);
																					setComboOpen(false);
																				}}
																			>
																				{essential.name}
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
