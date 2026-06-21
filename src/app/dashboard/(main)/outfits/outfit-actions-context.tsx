'use client';

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';

/**
 * Bridges the Outfits "New outfit" trigger (rendered in the wardrobe tab bar)
 * to the create flow that lives inside OutfitBuilder. The builder registers its
 * openCreate handler; the tab-bar button calls requestCreate to invoke it.
 */
interface OutfitActionsContextValue {
	registerCreate: (handler: (() => void) | null) => void;
	requestCreate: () => void;
}

const OutfitActionsContext = createContext<OutfitActionsContextValue | null>(
	null,
);

export function OutfitActionsProvider({ children }: { children: ReactNode }) {
	const handlerRef = useRef<(() => void) | null>(null);

	const value = useMemo<OutfitActionsContextValue>(
		() => ({
			registerCreate: (handler) => {
				handlerRef.current = handler;
			},
			requestCreate: () => {
				handlerRef.current?.();
			},
		}),
		[],
	);

	return (
		<OutfitActionsContext.Provider value={value}>
			{children}
		</OutfitActionsContext.Provider>
	);
}

/** Used by the tab-bar button to trigger the builder's create flow. */
export function useRequestOutfitCreate() {
	return useContext(OutfitActionsContext)?.requestCreate ?? (() => {});
}

/** Used by OutfitBuilder (when chromeless) to expose its openCreate handler. */
export function useRegisterOutfitCreate(handler: () => void) {
	const ctx = useContext(OutfitActionsContext);
	const [latest] = useState(() => ({ handler }));
	latest.handler = handler;

	useEffect(() => {
		if (!ctx) return;
		ctx.registerCreate(() => latest.handler());
		return () => ctx.registerCreate(null);
	}, [ctx, latest]);
}
