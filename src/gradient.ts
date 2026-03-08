export type GradientSegment = [color: string, percent100: number];
export type MeasuredGradientSegment = [color: string, startPercent100: number, endPercent100: number];

export type Gradient = GradientSegment[];

export const GRADIENT_DEFAULT: Readonly<Gradient> = Object.freeze([
	[ "red", 17 ],
	[ "orange", 17 ],
	[ "yellow", 16 ],
	[ "green", 16 ],
	[ "blue", 17 ],
	[ "purple", 17 ],
]);

export const measureGradient = (gradient: Readonly<Gradient>): MeasuredGradientSegment[] => {
	let at100 = 0;
	const measured: MeasuredGradientSegment[] = [];
	for (const [color, percent100] of gradient) {
		const next100 = at100 + percent100;
		measured.push([
			color,
			at100,
			next100,
		]);
		at100 = next100;
	}
	return measured;
}
