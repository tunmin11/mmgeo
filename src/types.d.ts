export type Language = 'en' | 'mm';

export interface Township {
	en: string;
	mm: string;
}

export interface District {
	en: string;
	mm: string;
	townships: Township[];
}

export interface State {
	en: string;
	mm: string;
	lat: number;
	lng: number;
	capital: string;
	districts: District[];
}

export function getStates(): State[];
export declare function initialize(config: { language?: Language }): void;