export type GradientSegment = [color: string, percent100: number];

export type Gradient = GradientSegment[];

export const GRADIENT_DEFAULT: Readonly<Gradient> = Object.freeze([
	[ "red", 17 ],
	[ "orange", 17 ],
	[ "yellow", 16 ],
	[ "green", 16 ],
	[ "blue", 17 ],
	[ "purple", 17 ],
]);
