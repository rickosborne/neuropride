export type DrawStrategy = "filled" | "split";
export type PatternOrientation = "behind" | "lanes" | "queue";

export type GradientSegment = [ color: string, percent100: number ];
export type MeasuredGradientSegment = [ color: string, startPercent100: number, endPercent100: number ];
export type Gradient = GradientSegment[];

export interface InfSpec {
	behindDeg?: number | undefined;
	drawStrategy?: DrawStrategy | undefined;
	gap?: number | undefined;
	gradient?: Gradient | undefined;
	inner: number;
	mask: number;
	pattern?: PatternOrientation | undefined;
	thickness: number;
	vScale: number;
}

export interface InfinityStats {
	cosTheta: number;
	/**
	 * Distance between the ring circles.  May be negative if they overlap.
	 */
	gap: number;
	/**
	 * y value of the left/right-most corner of a crossbar.
	 */
	h: number;
	/**
	 * Radius of the inside of a ring.
	 */
	inner: number;
	/**
	 * The x value for the intersection of the long edge of a crossbar with
	 * the short edge, when the angle is steep enough to cause it.
	 */
	ix: number | undefined;
	/**
	 * The y value for the intersection of the long edge of a crossbar with
	 * the short edge, when the angle is steep enough to cause it.
	 */
	iy: number | undefined;
	/**
	 * x value of the top/bottom-most corner of a crossbar.
	 */
	jx: number;
	/**
	 * y value of the top/bottom-most corner of a crossbar.
	 */
	jy: number;
	/**
	 * Distance between the y-axis and the center of a ring.
	 */
	p: number;
	/**
	 * x value of the left/right-most corner of a crossbar.
	 */
	q: number;
	/**
	 * Radius of the outside of a ring.
	 */
	r: number;
	/**
	 * y value of the intersection of a ring and the y-axis.
	 */
	riy: number;
	sinTheta: number;
	/**
	 * The angle the crossbars make with the x-axis.
	 */
	theta: number;
	/**
	 * The difference between `inner` and `r`.
	 */
	thick: number;
	/**
	 * The x value where a crossbar meets the x-axis.
	 */
	u: number;
	/**
	 * Intersection y of the crossbars, or 0 if none.
	 */
	v: number;
	/**
	 * True when `theta` is 90deg and there are no crossbars.
	 */
	vertical: boolean;
}

export interface MaskStats {
	/**
	 * Total height of all drawn portions of the image, including the mask.
	 */
	drawH: number;
	/**
	 * Total width of all drawn portions of the image, including the mask.
	 */
	drawW: number;
	m: number;
	/**
	 * Radial distance between the center of an arc and the inner mask.
	 */
	mInner: number;
	/**
	 * Radial distance between the center of an arc and the outer mask.
	 */
	mOuter: number;
	/**
	 * Thickness of the mask beyond the inner and outer rings.
	 */
	mask: number;
	/**
	 * The x value where the inner mask arc meets the inner mask crossbar.
	 * Equivalent to `stats.q`, for the mask.
	 */
	mix: number;
	/**
	 * The y value where the inner mask arc meets the inner mask crossbar.
	 * Equivalent to `stats.h`, for the mask.
	 */
	miy: number;
	/**
	 * Distance between the y-axis and the center of a ring.
	 */
	p: number;
	/**
	 * The angle the crossbars make with the x-axis.
	 */
	theta: number;
	/**
	 * The difference between `inner` and `r`.
	 */
	thick: number;
	/**
	 * The x value where a crossbar meets the x-axis.
	 */
	u: number;
	/**
	 * The x value where a crossbar mask meets the x-axis.
	 * Equivalent to `stats.u`, for the mask.
	 */
	um: number;
	/**
	 * True when `theta` is 90deg and there are no crossbars.
	 */
	vertical: boolean
}

export type SVGElementFn<E extends SVGElement> = (new () => E) & { prototype: E };

export interface SVGElementProxy<E extends SVGElement = SVGElement> {
	$el: E;
	fill: string;
	id: string;
	stroke: string;
	"stroke-width": number;
	transform: string;
}

export interface SVGPathProxy extends SVGElementProxy<SVGPathElement> {
	d: string;
}

export interface SVGLinearGradientProxy extends SVGElementProxy<SVGLinearGradientElement> {
	gradientTransform: string;
	gradientUnits: "userSpaceOnUse" | "objectBoundingBox";
	spreadMethod: "pad" | "reflect" | "repeat";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface SVGRadialGradientProxy extends SVGElementProxy<SVGRadialGradientElement> {
	gradientTransform: string;
	gradientUnits: "userSpaceOnUse" | "objectBoundingBox";
	spreadMethod: "pad" | "reflect" | "repeat";
	cx: number;
	cy: number;
	fr: number;
	fx: number;
	fy: number;
	r: number;
}

export interface SVGRectProxy extends SVGElementProxy<SVGRectElement> {
	height: number;
	width: number;
	x: number;
	y: number;
}
