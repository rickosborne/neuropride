import type { Gradient, MeasuredGradientSegment } from "./types.js";

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
	for (const [ color, percent100 ] of gradient) {
		const next100 = at100 + percent100;
		measured.push([
			color,
			at100,
			next100,
		]);
		at100 = next100;
	}
	return measured;
};

export const reverseGradient = (gradient: MeasuredGradientSegment[]): MeasuredGradientSegment[] => {
	return gradient.map((_mgs, index) => {
		const [color, start, end] = gradient[gradient.length - 1 - index]!;
		return [color, 100 - end, 100 - start];
	});
};
