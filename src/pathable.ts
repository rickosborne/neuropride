
import { fix3, type PointXY, radFromDeg } from "./geometry.js";

type StrokeDetails = string | [ stroke: string, strokeWidth: number ];

export interface Pathable {
	readonly length: number;
	readonly name: string;

	split(percent01: number): Pathable[] | undefined;

	stroke(color: string): StrokeDetails;

	toPath(): string;
}

abstract class PathableBase implements Pathable {
	protected constructor(
		public readonly name: string,
		public readonly length: number,
		public readonly invertPath: boolean,
	) {
		this.name = name;
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

	public toPath(): string {
		throw new Error(`Not implemented: ${ this.constructor.name }`);
	}
}

export class Triangle extends PathableBase {
	public constructor(
		name: string,
		public readonly x1: number,
		public readonly y1: number,
		public readonly x2: number,
		public readonly y2: number,
		public readonly x3: number,
		public readonly y3: number,
		length: number = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2,
		invertPath: boolean = false,
	) {
		super(name, length, invertPath);
	}

	public override toPath(): string {
		const { x1, y1, x2, y2, x3, y3 } = this;
		return `M ${ x1 },${ y1 } L ${ x2 },${ y2 } L ${ x3 },${ y3 } z`;
	}
}

export class Quad extends Triangle {
	public constructor(
		name: string,
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
		super(name, x1, y1, x2, y2, x3, y3, Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), invertPath);
	}

	public override split(percent01: number): Pathable[] {
		const { invertPath, x1, y1, x2, y2, x3, y3, x4, y4 } = this;
		const mx21 = fix3((x2 - x1) * percent01 + x1);
		const my21 = fix3((y2 - y1) * percent01 + y1);
		const mx34 = fix3((x3 - x4) * percent01 + x4);
		const my34 = fix3((y3 - y4) * percent01 + y4);
		return [
			new Quad(`${ this.name }-a`, x1, y1, mx21, my21, mx34, my34, x4, y4, invertPath),
			new Caulk(`${ this.name }-c`, mx21, my21, mx34, my34),
			new Quad(`${ this.name }-b`, mx21, my21, x2, y2, x3, y3, mx34, my34, invertPath),
		];
	}

	public override toPath(): string {
		const { x1, y1, x2, y2, x3, y3, x4, y4 } = this;
		return `M ${ x1 },${ y1 } L ${ x2 },${ y2 } L ${ x3 },${ y3 } L ${ x4 },${ y4 } z`;
	}
}

export class Arc extends PathableBase {
	constructor(
		name: string,
		public readonly cx: number,
		public readonly cy: number,
		public readonly ri: number,
		public readonly ro: number,
		public readonly startDeg: number,
		public readonly endDeg: number,
		invert: boolean = false,
	) {
		const rm = (ri + ro) / 2;
		const circ = Math.PI * rm * 2;
		const dd = Math.abs(endDeg - startDeg);
		super(name, fix3(circ * (dd / 360)), invert);
	}

	public override split(percent01: number): Pathable[] {
		const { cx, cy, invertPath, ri, ro, startDeg, endDeg } = this;
		const p01 = invertPath ? (1 - percent01) : percent01;
		const midDeg = fix3((endDeg - startDeg) * p01 + startDeg);
		const a = new Arc(`${ this.name }-a`, cx, cy, ri, ro, startDeg, midDeg, invertPath);
		const b = new Arc(`${ this.name }-b`, cx, cy, ri, ro, midDeg, endDeg, invertPath);
		const midRad = midDeg * Math.PI / 180;
		const cosMid = Math.cos(midRad);
		const sinMid = Math.sin(midRad);
		const cix = fix3(cx + cosMid * ri);
		const ciy = fix3(cy + sinMid * ri);
		const cox = fix3(cx + cosMid * ro);
		const coy = fix3(cy + sinMid * ro);
		const c = new Caulk(`${ this.name }-c`, cix, ciy, cox, coy);
		return invertPath ? [ b, c, a ] : [ a, c, b ];
	}

	public override toPath(): string {
		const { cx, cy, ri, ro, startDeg, endDeg } = this;
		const degChange = Math.abs(endDeg - startDeg);
		const { inner: [ six, siy ], outer: [ sox, soy ] } = this.pointsAtDeg(startDeg, cx, cy, ri, ro);
		const { inner: [ eix, eiy ], outer: [ eox, eoy ] } = this.pointsAtDeg(endDeg, cx, cy, ri, ro);
		const { inner: [ mix, miy ], outer: [ mox, moy ] } = this.pointsAtDeg((startDeg + endDeg) / 2, cx, cy, ri, ro);
		if (ri === 0 && degChange >= 180) {
			return `M ${ cx },${ cy } L ${ eox },${ eoy } A ${ ro },${ ro } 0 0 0 ${ mox },${ moy } A ${ ro },${ ro } 0 0 0 ${ sox },${ soy } z`;
		} else if (ri === 0) {
			return `M ${ cx },${ cy } L ${ eox },${ eoy } A ${ ro },${ ro } 0 0 0 ${ sox },${ soy } z`;
		}
		let arcIn: string, arcOut: string;
		if (degChange >= 180) {
			arcIn = `A ${ ri },${ ri } 0 0 1 ${ mix },${ miy } A ${ ri },${ ri } 0 0 1 ${ eix },${ eiy }`;
			arcOut = `A ${ ro },${ ro } 0 0 0 ${ mox },${ moy } A ${ ro },${ ro } 0 0 0 ${ sox },${ soy }`;
		} else {
			arcIn = `A ${ ri },${ ri } 0 0 1 ${ eix },${ eiy }`;
			arcOut = `A ${ ro },${ ro } 0 0 0 ${ sox },${ soy }`;
		}
		return `M ${ six },${ siy } ${ arcIn } L ${ eox },${ eoy } ${ arcOut } z`;
	}
}

/**
 * Due to rounding errors, it's common for adjacent shapes to have
 * hair thin gaps.  This cheats by drawing a line at that gap which
 * should be just thick enough to cover, but not so much to be
 * noticeable.
 */
export class Caulk extends PathableBase {
	constructor(
		name: string,
		public readonly x1: number,
		public readonly y1: number,
		public readonly x2: number,
		public readonly y2: number,
	) {
		super(name, 1, false);
	}

	public override stroke(color: string): StrokeDetails {
		return [ color, 1 ];
	}

	public override toPath(): string {
		const { x1, y1, x2, y2 } = this;
		return `M ${ x1 },${ y1 } L ${ x2 },${ y2 }`;
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
		name: string,
		{ bi, bo, ei, eo, ri, ro, si, sm }: NeckControls,
	) {
		const [ six, siy ] = si;
		const [ eix, eiy ] = ei;
		const [ eox, eoy ] = eo;
		const [ box, boy ] = bo;
		const id = Math.sqrt((six - eix) * (six - eix) + (siy - eiy) * (siy - eiy));
		const od = Math.sqrt((eox - box) * (eox - box) + (eoy - boy) * (eoy - boy));
		const length = fix3((id + od) / 2);
		super(name, length, false);
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
