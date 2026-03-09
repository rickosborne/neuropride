import { formatStyle } from "./dom-like.js";
import { fix3, type PointXY, radFromDeg } from "./geometry.js";
import type { MeasuredGradientSegment } from "./gradient.js";
import { type RickSVG, type SVGElementProxy, svgProxy } from "./svg.js";

type StrokeDetails = string | [ stroke: string, strokeWidth: number ];

export type DrawPart = "Underbar" | "Overbar" | "LRing" | "RRing";

/**
 * Slight overdraw to help eliminate abutment artifacts.
 */
const fudge = 2;

export interface Pathable {
	color: string;
	readonly drawPart: DrawPart;
	readonly id: string;
	readonly length: number;

	split(percent01: number): Pathable[] | undefined;

	stroke(color: string): StrokeDetails;

	toFilledPath(colors: MeasuredGradientSegment[], svg: RickSVG, g: SVGElementProxy<SVGGElement>): void;

	toPath(): string;
}

abstract class PathableBase implements Pathable {
	public color: string = "transparent";

	protected constructor(
		public readonly id: string,
		public readonly drawPart: DrawPart,
		public readonly length: number,
		public readonly invertPath: boolean,
	) {
	}

	protected fudgeSegment(x1: number, y1: number, x2: number, y2: number): [ fx: number, fy: number ] {
		const dx = x2 - x1;
		const dy = y2 - y1;
		if (dx === 0 && dy === 0) {
			return [ 0, 0 ];
		}
		const scale = fudge / Math.sqrt(dx * dx + dy + dy);
		const fx = fix3(dx * scale);
		const fy = fix3(dy * scale);
		return [ -fy, fx ];
	}

	protected pointsAtDeg(deg: number, cx: number, cy: number, ri: number, ro: number): { inner: PointXY, outer: PointXY } {
		const rad = radFromDeg(deg);
		const c = Math.cos(rad);
		const s = Math.sin(rad);
		const ox = fix3(cx + (c * ro));
		const oy = fix3(cy + (s * ro));
		const ix = fix3(cx + (c * ri));
		const iy = fix3(cy + (s * ri));
		return { inner: [ ix, iy ], outer: [ ox, oy ] };
	}

	public split(_percent01: number): Pathable[] | undefined {
		return undefined;
	}

	public stroke(_color: string): StrokeDetails {
		return "none";
	}

	public toFilledPath(colors: MeasuredGradientSegment[], svg: RickSVG, g: SVGElementProxy<SVGGElement>): void {
		const color = colors[ 0 ]?.[ 0 ] ?? "white";
		let $el = svgProxy<SVGElement>(svg.svg.querySelector(`#${ this.id }`)!);
		if ($el.$el.tagName.toLowerCase() !== "path") {
			$el.$el.parentNode?.removeChild($el.$el);
			svg.path(`<path d="${ this.toPath() }" id="${ this.id }" fill="${ color }" stroke="none" />`, g);
		} else {
			$el.fill = color;
			const stroke = this.stroke(color);
			$el.stroke = typeof stroke === "string" ? stroke : stroke[ 0 ];
			$el[ "stroke-width" ] = typeof stroke === "string" ? 0 : stroke[ 1 ];
		}
	}

	public toPath(): string {
		throw new Error(`Not implemented: ${ this.constructor.name }.toPath`);
	}
}

export class Triangle extends PathableBase {
	public constructor(
		id: string,
		drawPart: DrawPart,
		public readonly x1: number,
		public readonly y1: number,
		public readonly x2: number,
		public readonly y2: number,
		public readonly x3: number,
		public readonly y3: number,
		length: number = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2,
		invertPath: boolean = false,
	) {
		super(id, drawPart, length, invertPath);
	}

	public override toFilledPath(colors: MeasuredGradientSegment[], svg: RickSVG, g: SVGElementProxy<SVGGElement>): void {
		let color: string;
		if (colors.length > 1) {
			const { x1, y1, x2, y2 } = this;
			const gid = svg.linearGradient(colors, [ x1, y1 ], [ x2, y2 ]).id;
			color = `url(#${ gid })`;
		} else {
			color = colors[ 0 ]?.[ 0 ] ?? "transparent";
		}
		super.toFilledPath([ [ color, 0, 0 ] ], svg, g);
	}

	public override toPath(): string {
		const { x1, y1, x2, y2, x3, y3 } = this;
		const [ fx, fy ] = this.fudgeSegment(x2, y2, x3, y3);
		return `M ${ x1 },${ y1 } L ${ x2 },${ y2 } L ${ x2 + fx },${ y2 + fy } L ${ x3 + fx },${ y3 + fy } L ${ x3 },${ y3 } z`;
	}
}

export class Quad extends Triangle {
	public constructor(
		id: string,
		drawPart: DrawPart,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
		public readonly x4: number,
		public readonly y4: number,
		invertPath?: boolean,
	) {
		super(id, drawPart, x1, y1, x2, y2, x3, y3, Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), invertPath);
	}

	public override split(percent01: number): Pathable[] {
		const { drawPart, id, invertPath, x1, y1, x2, y2, x3, y3, x4, y4 } = this;
		const mx21 = fix3((x2 - x1) * percent01 + x1);
		const my21 = fix3((y2 - y1) * percent01 + y1);
		const mx34 = fix3((x3 - x4) * percent01 + x4);
		const my34 = fix3((y3 - y4) * percent01 + y4);
		return [
			new Quad(`${ id }-a`, drawPart, x1, y1, mx21, my21, mx34, my34, x4, y4, invertPath),
			new Quad(`${ id }-b`, drawPart, mx21, my21, x2, y2, x3, y3, mx34, my34, invertPath),
		];
	}

	public override toPath(): string {
		const { x1, y1, x2, y2, x3, y3, x4, y4 } = this;
		const [ fx, fy ] = this.fudgeSegment(x2, y2, x3, y3);
		return `M ${ x1 },${ y1 } L ${ x2 + fx },${ y2 + fy } L ${ x3 + fx },${ y3 + fy } L ${ x4 },${ y4 } z`;
	}
}

export class Arc extends PathableBase {
	public readonly big: boolean;
	public readonly endDeg: number;

	constructor(
		id: string,
		drawPart: DrawPart,
		public readonly cx: number,
		public readonly cy: number,
		public readonly ri: number,
		public readonly ro: number,
		public readonly startDeg: number,
		public readonly degChange: number,
		invert: boolean = false,
	) {
		const rm = (ri + ro) / 2;
		const circ = Math.PI * rm * 2;
		const portion = Math.abs(degChange) / 360;
		super(id, drawPart, fix3(circ * portion), invert);
		this.endDeg = startDeg + degChange;
		this.big = portion > 0.5;
	}

	public override split(percent01: number): Pathable[] {
		const { cx, cy, degChange, drawPart, id, invertPath, ri, ro, startDeg } = this;
		const dd = fix3(degChange * percent01);
		const rd = fix3(degChange - dd);
		const midDeg = fix3(startDeg + dd);
		const a = new Arc(`${ id }-a`, drawPart, cx, cy, ri, ro, startDeg, dd, invertPath);
		const b = new Arc(`${ id }-b`, drawPart, cx, cy, ri, ro, midDeg, rd, invertPath);
		return [ a, b ];
	}

	public override toFilledPath(grad: MeasuredGradientSegment[], svg: RickSVG, g: SVGElementProxy<SVGGElement>): void {
		if (grad.length === 1) {
			super.toFilledPath(grad, svg, g);
			return;
		}
		const { cx, cy, degChange, endDeg, id, invertPath, startDeg } = this;
		let colors: MeasuredGradientSegment[] = grad;
		let fromDeg: number;
		if (invertPath) {
			// These can only be defined in clockwise order, so we need to reverse them.
			colors = colors.map((_mgs, i, g) => {
				const [ c, s, e ] = g[ g.length - i - 1 ]!;
				return [ c, fix3(100 - e), fix3(100 - s) ];
			});
			fromDeg = (90 + endDeg) % 360;
		} else {
			colors = grad;
			fromDeg = (90 + startDeg) % 360;
		}
		const clipId = id.concat("-clip");
		svg.el(`<clipPath id="${ clipId }"><path d="${ this.toPath() }" fill="white" /></clipPath>`, SVGClipPathElement, svg.defs);
		const scale = Math.abs(degChange / 360);
		const stops = colors.flatMap(([ color, start, end ]) => [
			`${ color } ${ fix3(Math.abs(start * scale)) }%`,
			`${ color } ${ fix3(Math.abs(end * scale)) }%`,
		]).concat(`${ colors[ 0 ]![ 0 ] } 100%`);
		const divStyle = formatStyle({
			background: `conic-gradient(from ${ fix3(fromDeg) }deg, ${ stops.join(", ") })`,
			"background-position": `${ cx }px ${ cy }px`,
			height: "100%",
			width: "100%",
		});
		svg.el(`<foreignObject id="${ id }" width="${ svg.width }" height="${ svg.height }" x="-${ svg.width / 2 }" y="-${ svg.height / 2 }" clip-path="url(#${ clipId })"><div style="${ divStyle }" /></foreignObject>`, SVGForeignObjectElement, g);
	}

	public override toPath(offset: PointXY = [ 0, 0 ]): string {
		const { big, cx, cy, invertPath, ri, ro, startDeg, endDeg } = this;
		const f = this.invertPath ? -fudge : fudge;
		let { inner: [ six, siy ], outer: [ sox, soy ] } = this.pointsAtDeg(startDeg - f, cx, cy, ri, ro);
		let { inner: [ eix, eiy ], outer: [ eox, eoy ] } = this.pointsAtDeg(endDeg + f, cx, cy, ri, ro);
		six += offset[ 0 ];
		siy += offset[ 1 ];
		sox += offset[ 0 ];
		soy += offset[ 1 ];
		eix += offset[ 0 ];
		eiy += offset[ 1 ];
		eox += offset[ 0 ];
		eoy += offset[ 1 ];
		let lox: number, loy: number, lix: number, liy: number, rox: number, roy: number, rix: number, riy: number;
		if (invertPath) {
			lox = eox;
			loy = eoy;
			lix = eix;
			liy = eiy;
			rox = sox;
			roy = soy;
			rix = six;
			riy = siy;
		} else {
			lox = sox;
			loy = soy;
			lix = six;
			liy = siy;
			rox = eox;
			roy = eoy;
			rix = eix;
			riy = eiy;
		}
		if (ri === 0) {
			return `M ${ cx },${ cy } L ${ lox },${ loy } A ${ ro },${ ro } 0 ${ big ? 1 : 0 } 1 ${ rox },${ roy } z`;
		}
		return `M ${ lox },${ loy } A ${ ro },${ ro } 0 ${ big ? 1 : 0 } 1 ${ rox },${ roy } L ${ rix },${ riy } A ${ ri },${ ri } 0 ${ big ? 1 : 0 } 0 ${ lix },${ liy } z`;
	}
}

export interface NeckControls {
	bi: PointXY;
	bo: PointXY;
	ei: PointXY;
	eo: PointXY;
	ri: number;
	ro: number;
	si: PointXY;
	sm: PointXY;
}

/**
 * These are an odd shape which only become visible when one ring overlaps
 * the other's smaller crossbar.
 */
export class Neck extends PathableBase {
	public readonly bi: Readonly<PointXY>;
	public readonly bo: Readonly<PointXY>;
	public readonly ei: Readonly<PointXY>;
	public readonly eo: Readonly<PointXY>;
	public readonly ri: number;
	public readonly ro: number;
	public readonly si: Readonly<PointXY>;
	public readonly sm: Readonly<PointXY>;

	public constructor(
		id: string,
		drawPart: DrawPart,
		{ bi, bo, ei, eo, ri, ro, si, sm }: NeckControls,
	) {
		const [ six, siy ] = si;
		const [ eix, eiy ] = ei;
		const [ eox, eoy ] = eo;
		const [ box, boy ] = bo;
		const idd = Math.sqrt((six - eix) * (six - eix) + (siy - eiy) * (siy - eiy));
		const odd = Math.sqrt((eox - box) * (eox - box) + (eoy - boy) * (eoy - boy));
		const length = fix3((idd + odd) / 2);
		super(id, drawPart, length, false);
		this.bi = bi;
		this.bo = bo;
		this.ei = ei;
		this.eo = eo;
		this.si = si;
		this.sm = sm;
		this.ri = ri;
		this.ro = ro;
	}

	public override toPath(): string {
		const {
			bi: [ bix, biy ],
			bo: [ box, boy ],
			ei: [ eix, eiy ],
			eo: [ eox, eoy ],
			ri,
			ro,
			si: [ six, siy ],
			sm: [ smx, smy ],
		} = this;
		return `M ${ eox },${ eoy } A ${ ro },${ ro } 0 0 0 ${ box },${ boy } A ${ ro },${ ro } 0 0 1 ${ bix },${ biy } L ${ smx },${ smy } L ${ six },${ siy } A ${ ri },${ ri } 0 0 1 ${ eix },${ eiy } z`;
	}
}
