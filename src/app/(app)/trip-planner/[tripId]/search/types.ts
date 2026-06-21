export interface SearchResult {
	type: 'clothing' | 'essential' | 'container' | 'luggage';
	name: string;
	container?: string;
	luggage?: string;
	otherMatchers: string[];
	id: string;

	essentialCategory?: string;
	clothingDay?: Date;
	containerType?: string;

	provisionNames?: string[];

	containers?: Record<string, string[]>;
}
