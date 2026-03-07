export type PointXY = [x: number, y: number];
export type LineSegment = [x1: number, y1: number, x2: number, y2: number];

export const degFromRad = (rad: number): number => fix3(180 * rad / Math.PI);

export const radFromDeg = (deg: number): number => fix3(Math.PI * deg / 180);

/**
 * @see {@link https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection|Line-line intersection}
 */
export const intersect = (line1: LineSegment, line2: LineSegment): PointXY | [ undefined, undefined ] => {
	const [ x1, y1, x2, y2 ] = line1;
	const [ x3, y3, x4, y4 ] = line2;
	const x34 = x3 - x4;
	const x12 = x1 - x2;
	const y34 = y3 - y4;
	const y12 = y1 - y2;
	const d = x12 * y34 - y12 * x34;
	if (d === 0) {
		return [ undefined, undefined ];
	}
	const x1y2y1x2 = (x1 * y2) - (y1 * x2);
	const x3y4y3x4 = (x3 * y4) - (y3 * x4);
	const nx = x1y2y1x2 * x34 - x12 * x3y4y3x4;
	const ny = x1y2y1x2 * y34 - y12 * x3y4y3x4;
	const x = nx / d;
	const y = ny / d;
	if (x < Math.min(x1, x2) || x > Math.max(x1, x2) || x < Math.min(x3, x4) || x > Math.max(x3, x4) || y < Math.min(y1, y2) || y > Math.max(y1, y2) || y < Math.min(y3, y4) || y > Math.max(y3, y4)) {
		return [ undefined, undefined ];
	}
	return [ x, y ];
};

export const fix3 = (n: number): number => Math.round(n * 1_000) / 1_000;
