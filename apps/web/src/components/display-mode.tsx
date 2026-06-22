'use client';

import { Images, Type, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
	createContext,
	useContext,
	useState,
	useTransition,
	type ReactNode,
} from 'react';

import { updateUserSettings } from '@/app/(app)/account/_data/api';
import { DisplayMode } from '@/generated/prisma/enums';

import { Segmented } from './segmented';

interface DisplayModeContextValue {
	mode: DisplayMode;
	setMode: (mode: DisplayMode) => void;
}

const DisplayModeContext = createContext<DisplayModeContextValue>({
	mode: DisplayMode.Both,
	setMode: () => {},
});

export function DisplayModeProvider({
	initial,
	children,
}: {
	initial: DisplayMode;
	children: ReactNode;
}) {
	const [mode, setMode] = useState<DisplayMode>(initial);
	return (
		<DisplayModeContext.Provider value={{ mode, setMode }}>
			{children}
		</DisplayModeContext.Provider>
	);
}

export function useDisplayMode() {
	return useContext(DisplayModeContext).mode;
}

/** Text / Picture / Both toggle. Optimistic locally, persisted per user. */
export function DisplayToggle() {
	const { mode, setMode } = useContext(DisplayModeContext);
	const [, startTransition] = useTransition();
	const router = useRouter();

	function change(next: DisplayMode) {
		setMode(next);
		startTransition(async () => {
			await updateUserSettings({ displayMode: next });
			// The display mode is server-rendered + prop-drilled as `initial`; refresh
			// so a later render reads the persisted value (replaces revalidatePath).
			router.refresh();
		});
	}

	return (
		<Segmented
			value={mode}
			onValueChange={change}
			options={[
				{ value: DisplayMode.TextOnly, icon: <Type />, title: 'Text only' },
				{
					value: DisplayMode.PictureOnly,
					icon: <ImageIcon />,
					title: 'Pictures only',
				},
				{ value: DisplayMode.Both, icon: <Images />, title: 'Text and pictures' },
			]}
		/>
	);
}
