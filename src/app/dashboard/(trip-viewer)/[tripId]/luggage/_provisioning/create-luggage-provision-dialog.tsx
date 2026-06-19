'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Luggage, Trip } from '@/generated/prisma/client';
import { ChevronsUpDown, Plus } from 'lucide-react';
import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../../../../../components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../../../../../components/ui/form';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../../../../components/ui/popover';
import { ScrollArea } from '../../../../../../components/ui/scroll-area';
import { cn } from '../../../../../../lib/utils';
import { createLuggageProvision } from './_data/actions';
import { createLuggageProvisionSchema } from './_data/schemas';

interface CreateLuggageProvisionDialogProps {
	trip: Trip;
	luggage: Luggage[];
}
export function CreateLuggageProvisionDialog({
	trip,
	luggage,
}: CreateLuggageProvisionDialogProps) {
	const [open, setOpen] = useState(false);

	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof createLuggageProvisionSchema>>({
		resolver: zodResolver(createLuggageProvisionSchema),
	});
	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createLuggageProvision(trip.id, data);
			form.reset();
			setOpen(false);
		}),
	);

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
				<span className="hidden md:block">Add Luggage</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add Luggage Provision</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="luggageId"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Luggage</FormLabel>
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
													? luggage.find((a) => a.id === field.value)?.name
													: "Select the luggage you'd like to add"}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[--radix-popover-trigger-width] p-0"
											align="start"
										>
											<Command>
												<CommandInput placeholder="Search your containers..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>No luggage found.</CommandEmpty>
														{luggage.map((lug) => (
															<CommandItem
																value={lug.name}
																key={lug.id}
																onSelect={() => {
																	form.setValue('luggageId', lug.id);
																	setComboOpen(false);
																}}
															>
																{lug.name}
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
							<Button type="submit" loading={isPending}>
								Add Luggage
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
