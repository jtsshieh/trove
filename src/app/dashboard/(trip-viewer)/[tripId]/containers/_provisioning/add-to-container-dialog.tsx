'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type {
	Clothing,
	ClothingProvision,
	ContainerProvision,
	Essential,
	EssentialProvision,
} from '@/generated/prisma/client';
import { ChevronsUpDown, Plus } from 'lucide-react';
import React, { useState, useTransition } from 'react';
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
import { generateClothingName } from '../../../../../../lib/generate-clothing-name';
import { cn } from '../../../../../../lib/utils';
import {
	addClothingProvisionToContainer,
	addEssentialProvisionToContainer,
} from './_data/actions';
import {
	addClothingProvisionToContainerSchema,
	addEssentialProvisionToContainerSchema,
} from './_data/schemas';

interface AddToContainerClothingDialogProps {
	containerProvision: ContainerProvision;
	clothingProvisions: (ClothingProvision & { clothing: Clothing })[];
}

export function AddToContainerClothingDialog({
	containerProvision,
	clothingProvisions,
}: AddToContainerClothingDialogProps) {
	const [open, setOpen] = useState(false);

	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof addClothingProvisionToContainerSchema>>({
		resolver: zodResolver(addClothingProvisionToContainerSchema),
	});
	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await addClothingProvisionToContainer(
				containerProvision.id,
				data.clothingProvisionId,
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
							<DialogTitle>Add Clothing Provision to Container</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="clothingProvisionId"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Clothing Provision</FormLabel>
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
															clothingProvisions.find(
																(a) => a.id === field.value,
															)?.clothing as Clothing,
														)
													: "Select the clothing provision you'd like to add"}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
											<Command>
												<CommandInput placeholder="Search your clothing provisions..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>
															No clothing provision found.
														</CommandEmpty>
														{clothingProvisions.map((clothingProvision) => (
															<CommandItem
																value={generateClothingName(
																	clothingProvision.clothing,
																)}
																key={clothingProvision.id}
																onSelect={() => {
																	form.setValue(
																		'clothingProvisionId',
																		clothingProvision.id,
																	);
																	setComboOpen(false);
																}}
															>
																{generateClothingName(
																	clothingProvision.clothing,
																)}
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
								Add to Container
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

interface AddToContainerEssentialDialogProps {
	containerProvisions: ContainerProvision;
	essentialProvisions: (EssentialProvision & { essential: Essential })[];
}

export function AddToContainerEssentialDialog({
	containerProvisions,
	essentialProvisions,
}: AddToContainerEssentialDialogProps) {
	const [open, setOpen] = useState(false);

	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof addEssentialProvisionToContainerSchema>>({
		resolver: zodResolver(addEssentialProvisionToContainerSchema),
	});
	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await addEssentialProvisionToContainer(
				containerProvisions.id,
				data.essentialProvisionId,
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
							<DialogTitle>Add Essential Provision to Container</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="essentialProvisionId"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Essential Provision</FormLabel>
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
													? essentialProvisions.find(
															(a) => a.id === field.value,
														)?.essential.name
													: "Select the essential provision you'd like to add"}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
											<Command>
												<CommandInput placeholder="Search your essential provisions..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>
															No essential provision found.
														</CommandEmpty>
														{essentialProvisions.map((essentialProvision) => (
															<CommandItem
																value={essentialProvision.essential.name}
																key={essentialProvision.id}
																onSelect={() => {
																	form.setValue(
																		'essentialProvisionId',
																		essentialProvision.id,
																	);
																	setComboOpen(false);
																}}
															>
																{essentialProvision.essential.name}
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
								Add to Container
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
