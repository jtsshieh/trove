'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type {
	Container,
	ContainerProvision,
	Luggage,
	LuggageProvision,
} from '@/generated/prisma/client';
import { ChevronsUpDown, Plus, Trash, TrashIcon } from 'lucide-react';
import React, { FormEvent, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../../../../../components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from '../../../../../../components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import {
	addContainerProvisionToLuggage,
	deleteContainerProvisionFromLuggage,
	deleteLuggageProvision,
} from './_data/actions';
import { addContainerProvisionToLuggageSchema } from './_data/schemas';

interface AddContainerToLuggageDialogProps {
	luggageProvision: LuggageProvision;
	containerProvisions: (ContainerProvision & {
		container: Container;
	})[];
}

export function AddContainerToLuggageDialog({
	luggageProvision,
	containerProvisions,
}: AddContainerToLuggageDialogProps) {
	const [open, setOpen] = useState(false);

	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof addContainerProvisionToLuggageSchema>>({
		resolver: zodResolver(addContainerProvisionToLuggageSchema),
	});
	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await addContainerProvisionToLuggage(
				luggageProvision.id,
				data.containerProvisionId,
			);
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
			<DialogTrigger render={<Button size="icon" />}>
				<Plus />
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add Container Provision to Luggage</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="containerProvisionId"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Container</FormLabel>
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
													? containerProvisions.find(
															(a) => a.id === field.value,
														)?.container?.name
													: "Select the container provision you'd like to add"}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
											<Command>
												<CommandInput placeholder="Search your container provisions..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>
															No container provision found.
														</CommandEmpty>
														{containerProvisions.map((containerProvision) => (
															<CommandItem
																value={containerProvision.container.name}
																key={containerProvision.id}
																onSelect={() => {
																	form.setValue(
																		'containerProvisionId',
																		containerProvision.id,
																	);
																	setComboOpen(false);
																}}
															>
																{containerProvision.container.name}
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
								Add to Luggage
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteContainerFromLuggageDialog({
	luggageProvisionId,
	containerProvisionId,
}: {
	luggageProvisionId: string;
	containerProvisionId: string;
}) {
	const [isPending, startTransition] = useTransition();
	const onClick = () =>
		startTransition(async () => {
			await deleteContainerProvisionFromLuggage(
				luggageProvisionId,
				containerProvisionId,
			);
		});
	return (
		<Button
			size="icon"
			variant="ghost"
			onClick={onClick}
			className="h-8 w-8"
			loading={isPending}
		>
			{!isPending && <TrashIcon size={16} />}
		</Button>
	);
}

export function DeleteLuggageProvisionDialog({
	luggageProvision,
}: {
	luggageProvision: LuggageProvision & { luggage: Luggage };
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const onSubmit = (e: FormEvent<HTMLFormElement>) =>
		startTransition(async () => {
			e.preventDefault();
			await deleteLuggageProvision(luggageProvision.id);
			setOpen(false);
		});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete Luggage Provision</DialogTitle>
					<DialogDescription>
						Are you sure you want to remove {luggageProvision.luggage.name} from
						this trip? This luggage will NOT be deleted, only it's provision to
						this trip.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						onClick={(e) => {
							e.preventDefault();
							setOpen(false);
						}}
						variant="secondary"
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type="submit" loading={isPending}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
