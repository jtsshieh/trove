'use client';

import { useRouter } from 'next/navigation';
import {
	createContext,
	startTransition,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from 'react';

import { updateUserSettings } from '@/app/(app)/account/_data/api';
import { PieceSize, ProvisionView } from '@/generated/prisma/enums';

const CLOSET_PREF = 'pkl:clothing-closet';

/**
 * The clothing board's view-level UI state (list/calendar, piece size, closet
 * sidebar). It's shared between the streamed header actions (the toggles) and the
 * board body, so it lives in a context that wraps both — lifting it out of the board
 * island lets the static header paint while the board data streams. Persisting
 * view/pieceSize mirrors the previous in-board behaviour (settings + router.refresh).
 */
interface ClothingBoardControls {
	view: ProvisionView;
	changeView: (next: ProvisionView) => void;
	pieceSize: PieceSize;
	changePieceSize: (next: PieceSize) => void;
	closetOpen: boolean;
	toggleCloset: () => void;
	/** Apply the saved open/closed preference. Called from the board (a Suspense
	 * child) AFTER it hydrates, so the closet hydrates closed (matching the server)
	 * and only then opens — avoiding a cross-Suspense hydration mismatch. */
	restoreCloset: () => void;
}

const ClothingBoardControlsContext = createContext<ClothingBoardControls | null>(
	null,
);

export function ClothingBoardControlsProvider({
	initialView,
	initialPieceSize,
	children,
}: {
	initialView: ProvisionView;
	initialPieceSize: PieceSize;
	children: ReactNode;
}) {
	const router = useRouter();
	const [view, setView] = useState<ProvisionView>(initialView);
	const [pieceSize, setPieceSize] = useState<PieceSize>(initialPieceSize);
	// The closet docks as a toggleable sidebar, closed by default so the board
	// (especially the 7-column calendar) gets full width. The saved-open preference is
	// applied via restoreCloset() — invoked by the board after IT hydrates — not in a
	// provider mount effect, which (this provider sits outside the board's Suspense
	// boundary) would flip the state before the board hydrates and mismatch.
	const [closetOpen, setClosetOpen] = useState(false);
	const restoreCloset = useCallback(() => {
		if (localStorage.getItem(CLOSET_PREF) === 'open') setClosetOpen(true);
	}, []);

	function toggleCloset() {
		setClosetOpen((open) => {
			localStorage.setItem(CLOSET_PREF, open ? 'closed' : 'open');
			return !open;
		});
	}

	function changeView(next: ProvisionView) {
		setView(next);
		startTransition(async () => {
			await updateUserSettings({ defaultProvisionView: next });
			router.refresh();
		});
	}

	function changePieceSize(next: PieceSize) {
		setPieceSize(next);
		startTransition(async () => {
			await updateUserSettings({ pieceSize: next });
			router.refresh();
		});
	}

	return (
		<ClothingBoardControlsContext.Provider
			value={{
				view,
				changeView,
				pieceSize,
				changePieceSize,
				closetOpen,
				toggleCloset,
				restoreCloset,
			}}
		>
			{children}
		</ClothingBoardControlsContext.Provider>
	);
}

export function useClothingBoardControls(): ClothingBoardControls {
	const ctx = useContext(ClothingBoardControlsContext);
	if (!ctx)
		throw new Error(
			'useClothingBoardControls must be used within a ClothingBoardControlsProvider',
		);
	return ctx;
}
