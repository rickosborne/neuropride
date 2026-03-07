import { byId } from "./dom-like.js";
import { degFromRad, fix3, intersect } from "./geometry.js";
import { type Gradient, GRADIENT_DEFAULT } from "./gradient.js";
import { Arc, Neck, type Pathable, Quad, Triangle } from "./pathable.js";
import { randomId } from "./random-id.js";
import { Spectacle } from "./spectacle.js";
import { RickSVG, type SVGElementProxy } from "./svg.js";

export interface InfSpec {
	gap?: number | undefined;
	gradient?: Gradient | undefined;
	inner: number;
	mask: number;
	thickness: number;
	vScale: number;
}

interface InfinityStats {
	cosTheta: number;
	h: number;
	inner: number;
	ix: number | undefined;
	iy: number | undefined;
	jx: number;
	jy: number;
	p: number;
	q: number;
	r: number;
	riy: number;
	sinTheta: number;
	theta: number;
	thick: number;
	u: number;
	v: number;
	vertical: boolean;
}

interface MaskStats {
	m: number;
	mInner: number;
	mOuter: number;
	mask: number;
	mix: number;
	miy: number;
	p: number;
	theta: number;
	thick: number;
	u: number;
	um: number;
	vertical: boolean
}

export class NeuroPrideInf {
	readonly #gap: Spectacle<number>;
	readonly #gradient: Spectacle<Readonly<Gradient>>;
	readonly #mask: Spectacle<number>;
	readonly #thickness: Spectacle<number>;
	readonly #vScale: Spectacle<number>;
	public readonly px: number;
	private svg: SVGElement | undefined;

	public constructor(init: Partial<InfSpec> = {}) {
		this.#gap = Spectacle.of(Math.max(-1, Math.min(1, init.gap ?? 0)));
		this.#mask = Spectacle.of(Math.max(0, Math.min(1, init.mask ?? 0)));
		this.#thickness = Spectacle.of(init.thickness ?? 1);
		this.#vScale = Spectacle.of(init.vScale ?? 1);
		this.#gradient = Spectacle.of(init.gradient ?? GRADIENT_DEFAULT);
		this.px = 1200;
	}

	public asSVG($parent: HTMLElement): RickSVG {
		const rootId = randomId();
		const { px } = this;
		const halfPx = px / 2;
		const svg = new RickSVG($parent, px * 1.25, px * 0.75);
		const $infoR = byId("info-r", HTMLTableCellElement);
		const $infoGap = byId("info-gap", HTMLTableCellElement);
		const $infoP = byId("info-p", HTMLTableCellElement);
		const $infoInner = byId("info-inner", HTMLTableCellElement);
		const $infoThick = byId("info-thick", HTMLTableCellElement);
		const $infoAngle = byId("info-angle", HTMLTableCellElement);
		const $infoMask = byId("info-mask", HTMLTableCellElement);
		const $infoJx = byId("info-jx", HTMLTableCellElement);
		const setInfo = (ce: HTMLTableCellElement | undefined, value: string | number): void => {
			if (ce != null) {
				ce.innerText = String(value);
			}
		};
		const gTransform = this.#vScale.map((vScale) => {
			return `translate(${ halfPx * 1.25 } ${ halfPx * 0.75 }) scale(1,${ -vScale })`;
		});
		const stats: Spectacle<InfinityStats> = Spectacle.compose(this.#gap, this.#thickness, (gap1, thickness01) => {
			const r = fix3(px / 5);
			setInfo($infoR, r);
			let gap = fix3(r * gap1 * thickness01);
			setInfo($infoGap, gap);
			const thick01 = Math.max(thickness01, 0.01);
			const inner01 = 1 - thick01;
			const thick = fix3(thick01 * r);
			setInfo($infoThick, thick);
			const inner = fix3(inner01 * r);
			setInfo($infoInner, inner);
			const p = inner + thick + (gap / 2);
			setInfo($infoP, p);
			let thetaRad = fix3(Math.asin((inner + (thick / 2)) / p));
			let theta = degFromRad(thetaRad);
			let vertical = false;
			if (Number.isNaN(thetaRad) || Number.isNaN(theta) || theta >= 90) {
				theta = 90;
				thetaRad = Math.PI / 2;
				vertical = true;
			}
			let cosTheta, sinTheta, uOff, v;
			if (vertical) {
				cosTheta = 0;
				sinTheta = 1;
				uOff = 0;
				v = 0;
			} else {
				cosTheta = Math.cos(thetaRad);
				sinTheta = Math.sin(thetaRad);
				uOff = Math.round(inner / sinTheta);
				v = Math.round(thick / (2 * cosTheta));
			}
			setInfo($infoAngle, `${ theta }°`);
			const h = fix3(inner * cosTheta);
			const qOff = Math.round(inner * sinTheta);
			const q = p - qOff;
			const u = p - uOff;
			const jx = Math.round(p - (r * sinTheta));
			setInfo($infoJx, jx);
			const jy = Math.round(r * cosTheta);
			let [ ix, iy ] = intersect([ -q, -h, jx, jy ], [ -q, h, -jx, jy ]).map((n) => n == null ? undefined : fix3(n));
			// Intersection of the rings
			// (x-p)^2 + y*y = r*r
			// y = sqrt(r*r - p*p)
			const riy = fix3(Math.sqrt(r * r - p * p));
			return { cosTheta, h, inner, ix, iy, jx, jy, q, p, r, riy, sinTheta, theta, thick, u, v, vertical };
		});
		const maskStats: Spectacle<MaskStats> = Spectacle.compose(this.#mask, stats, (mask01, statsValues) => {
			const { cosTheta, inner, p, r, sinTheta, theta, thick, u, vertical } = statsValues;
			let mask = fix3(Math.min(inner, thick) * mask01);
			if (mask01 > 0 && mask === 0) {
				if (inner === 0) {
					// This is arbitrary, but it's reasonable.
					mask = fix3(thick * mask01 * 0.25);
				} else {
					mask = fix3(thick * mask01);
				}
			}
			setInfo($infoMask, mask);
			const m = fix3(p * cosTheta);
			const mInner = inner - mask;
			const mOuter = r + mask;
			const um = fix3(mask / sinTheta);
			const mix = fix3(mInner * sinTheta);
			const miy = fix3(mInner * cosTheta);
			return { m, mask, mInner, mOuter, mix, miy, p, theta, thick, u, um, vertical };
		});
		svg.group((g, s) => {
			gTransform.watch((transform) => {
				g.transform = transform;
			}, true);
			const leftMaskRing = s.path('<path d="" fill="black" stroke="none" />', g);
			const rightMaskRing = s.path('<path d="" fill="black" stroke="none" />', g);
			const leftMaskBar = s.rect('<rect fill="black" stroke="none" />', g);
			const rightMaskBar = s.rect('<rect fill="black" stroke="none" />', g);
			maskStats.map(({ m, mask, mInner, mOuter, mix, miy, p, theta, thick, u, um, vertical }) => {
				if (mask > 0) {
					if (mInner > 0) {
						// Need to cut out the full teardrop.
						leftMaskRing.d = `M ${ fix3(-p + mOuter) },0 A ${ mOuter },${ mOuter } 0 1 0 ${ -p - mOuter },0 h ${ thick + mask + mask } A ${ mInner },${ mInner } 0 0 1 ${ -p + mix },${ -miy } L ${ -u - um },0 L ${ -p + mix },${ miy } A ${ mInner },${ mInner } 0 0 1 ${ -p - mInner },0 h ${ -thick - mask - mask } A ${ mOuter },${ mOuter } 0 0 0 ${ -p + mOuter },0 z`;
						rightMaskRing.d = `M ${ fix3(p - mOuter) },0 A ${ mOuter },${ mOuter } 0 1 0 ${ p + mOuter },0 h ${ -thick - mask - mask } A ${ mInner },${ mInner } 0 0 1 ${ p - mix },${ miy } L ${ u + um },0 L ${ p - mix },${ -miy } A ${ mInner },${ mInner } 0 0 1 ${ p + mInner },0 h ${ thick + mask + mask } A ${ mOuter },${ mOuter } 0 0 0 ${ p - mOuter },0 z`;
					} else {
						// No cutout, just circles.
						leftMaskRing.d = `M ${ -p + mOuter },0 A ${ mOuter },${ mOuter } 0 1 0 ${ -p - mOuter },0 A ${ mOuter },${ mOuter } 0 1 0 ${ -p + mOuter },0 z`;
						rightMaskRing.d = `M ${ p + mOuter },0 A ${ mOuter },${ mOuter } 0 1 0 ${ p - mOuter },0 A ${ mOuter },${ mOuter } 0 1 0 ${ p + mOuter },0 z`;
					}
					if (vertical) {
						// No mask crossbars.
						leftMaskBar.width = 0;
						leftMaskBar.height = 0;
						rightMaskBar.width = 0;
						rightMaskBar.height = 0;
					} else {
						// Full mask crossbars.
						leftMaskBar.x = -m;
						leftMaskBar.y = (thick / -2) - mask;
						leftMaskBar.width = 2 * m;
						leftMaskBar.height = thick + mask + mask;
						leftMaskBar.transform = `rotate(${ theta })`;
						rightMaskBar.x = -m;
						rightMaskBar.y = (thick / -2) - mask;
						rightMaskBar.width = 2 * m;
						rightMaskBar.height = thick + mask + mask;
						rightMaskBar.transform = `rotate(${ -theta })`;
					}
				} else {
					// No mask at all.
					leftMaskBar.width = 0;
					leftMaskBar.height = 0;
					rightMaskBar.width = 0;
					rightMaskBar.height = 0;
					leftMaskRing.d = "";
					rightMaskRing.d = "";
				}
			});
		});
		svg.group((g, s) => {
			gTransform.watch((transform) => {
				g.transform = transform;
			}, true);
			Spectacle.compose(this.#gradient, stats, (gradient, statsValues) => {
				const paths = this.generatePaths(g, statsValues);
				this.renderSplitPaths(paths, gradient, s, rootId, g);
			});
		}, undefined, rootId);
		return svg;
	}

	public attachTo($el: HTMLElement): void {
		this.svg?.parentElement?.removeChild(this.svg);
		const svg = this.asSVG($el);
		this.svg = svg.svg;
	}

	private generatePaths(
		g: SVGElementProxy<SVGGElement>,
		stats: InfinityStats,
	): Pathable[] {
		const { h, inner, ix, iy, jx, jy, q, p, r, riy, theta, u, v, vertical } = stats;
		for (const child of Array.from(g.$el.childNodes)) {
			g.$el.removeChild(child);
		}
		const front: Pathable[] = [];
		const back: Pathable[] = [];
		if (jx < 0) {
			if (ix != null && iy != null) {
				// Triangular wedges instead of crossbars.
				front.push(new Triangle("nwCross", -u, 0, -q, h, ix, iy));
				back.unshift(new Triangle("seCross", u, 0, q, -h, -ix, -iy));
			} else {
				// Vertical — no crossbars.
			}
		} else if (inner === 0) {
			// Big triangular wedges
			front.push(new Triangle("nwCross", -p, 0, -jx, jy, 0, v));
			back.unshift(new Triangle("seCross", 0, -v, p, 0, jx, -jy, undefined, true));
		} else {
			// Normal rectangles.
			front.push(new Quad("nwCross", -u, 0, -q, h, -jx, jy, 0, v));
			back.unshift(new Quad("seCross", u, 0, q, -h, jx, -jy, 0, -v));
		}
		if (vertical) {
			// bigCross.d = "";
			front.push(new Neck("nwNeck", {
				bi: [ -p + inner, 0 ],
				bo: [ 0, riy ],
				ei: [ -p, inner ],
				eo: [ -p, r ],
				ri: inner,
				ro: r,
				si: [ -p + inner, 0 ],
				sm: [ -p + inner, 0 ],
			}));
			front.push(new Arc("leftArc", -p, 0, inner, r, 90, 270 + theta));
			back.unshift(new Neck("seNext", {
				bi: [ p - inner, 0 ],
				bo: [ 0, -riy ],
				ei: [ p, -inner ],
				eo: [ p, -r ],
				ri: inner,
				ro: r,
				si: [ p - inner, 0 ],
				sm: [ p - inner, 0 ],
			}));
			back.unshift(new Arc("rightArc", p, 0, inner, r, 270, 450 + theta, true));
		} else {
			if (jx < 0) {
				front.push(new Neck("nwNeck", {
					bi: [ jx, jy ],
					bo: [ 0, riy ],
					ei: [ -p, inner ],
					eo: [ -p, r ],
					ri: inner,
					ro: r,
					si: [ -q, h ],
					sm: [ ix ?? -q, iy ?? h ],
				}));
				// front.push(new Caulk("nwCaulk", -p, inner, -p, r));
				front.push(new Arc("leftArc", -p, 0, inner, r, 90, 270 + theta));
				back.unshift(new Neck("seNeck", {
					bi: [ -jx, -jy ],
					bo: [ 0, -riy ],
					ei: [ p, -inner ],
					eo: [ p, -r ],
					ri: inner,
					ro: r,
					si: [ q, -h ],
					sm: [ ix == null ? q : -ix, iy == null ? -h : -iy ],
				}));
				// back.unshift(new Caulk("seCaulk", p, -inner, p, -r));
				back.unshift(new Arc("rightArc", p, 0, inner, r, 270, 450 + theta, true));
			} else {
				front.push(new Arc("leftArc", -p, 0, inner, r, 90 - theta, 270 + theta));
				back.unshift(new Arc("rightArc", p, 0, inner, r, 270 - theta, 450 + theta, true));
			}
			// front.push(new Caulk("swCaulk", -jx, -jy, -q, -h));
			front.push(new Quad("bigCross", -q, -h, jx, jy, q, h, -jx, -jy));
			// back.unshift(new Caulk("neCaulk", jx, jy, q, h));
		}
		return front.concat(back);
	}

	private renderSplitPaths(
		paths: Pathable[],
		gradient: Readonly<Gradient>,
		svg: RickSVG,
		rootId: string,
		g: SVGElementProxy<SVGGElement>,
	): void {
		const totalLength = fix3(paths.reduce((p, c) => p + c.length, 0));
		let atLength = 0;
		let goal100 = 0;
		let lastColor = "transparent";
		let colorsRemain = gradient.length;
		for (const [ color, percent100 ] of gradient) {
			colorsRemain--;
			lastColor = color;
			goal100 += percent100;
			const goalLength = fix3((goal100 / 100) * totalLength);
			while (atLength < goalLength && paths.length > 0) {
				const path = paths.shift()!;
				let toRender: Pathable = path;
				if ((path.length + atLength) > goalLength) {
					const needLength = fix3(goalLength - atLength);
					const percent01 = fix3(needLength / path.length);
					if (percent01 > 0.02) {
						const subs = path.split(percent01);
						if (subs != null) {
							toRender = subs.shift()!;
							while (subs.length > 0) {
								paths.unshift(subs.pop()!);
							}
						}
					}
				}
				const stroke = toRender.stroke(color);
				svg.path(`<path d="${ toRender.toPath() }" id="path-${ rootId }-${ toRender.name }" fill="${ color }" ${ typeof stroke === "string" ? `stroke="${ stroke }"` : `stroke="${ stroke[ 0 ] }" stroke-width="${ stroke[ 1 ] }"` } />`, g);
				console.log(toRender);
				atLength += toRender.length;
				if (atLength < goalLength && ((goalLength - atLength) / goalLength) < 0.05) {
					if (colorsRemain > 0 || paths.length === 0) {
						break; // continue on to next color
					}
				}
			}
		}
		for (const path of paths) {
			svg.path(`<path d="${ path.toPath() }" id="path-${ rootId }-${ path.name }" fill="${ lastColor }" stroke="none" />`, g);
		}
	}

	public setGap(gap: number): void {
		this.#gap.update(gap);
	}

	public setGradient(gradient: Gradient): void {
		this.#gradient.update(gradient);
	}

	public setMask(mask: number): void {
		this.#mask.update(mask);
	}

	public setThickness(thickness: number): void {
		this.#thickness.update(thickness);
	}

	public setVScale(vScale: number): void {
		this.#vScale.update(vScale);
	}
}
