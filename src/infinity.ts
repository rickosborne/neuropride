import { byId } from "./dom-like.js";
import { degFromRad, fix3, intersect, type PointXY, radFromDeg } from "./geometry.js";
import { type Gradient, GRADIENT_DEFAULT, type MeasuredGradientSegment, measureGradient, reverseGradient } from "./gradient.js";
import { Arc, type DrawPart, Neck, type Pathable, Quad, Triangle } from "./pathable.js";
import { randomId } from "./random-id.js";
import { Spectacle } from "./spectacle.js";
import { RickSVG, type SVGElementProxy, svgProxy } from "./svg.js";

export type DrawStrategy = "filled" | "split";
export type PatternOrientation = "behind" | "lanes" | "queue";

export const asDrawStrategy = (ds: string): DrawStrategy => ds === "split" ? "split" : "filled";
export const asPatternOrientation = (po: string): PatternOrientation => po === "behind" || po === "lanes" ? po : "queue";

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

interface InfinityStats {
	cosTheta: number;
	gap: number;
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
	drawH: number;
	drawW: number;
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
	readonly #behindDeg: Spectacle<number>;
	readonly #drawStrategy: Spectacle<DrawStrategy>;
	readonly #gap: Spectacle<number>;
	readonly #gradient: Spectacle<Readonly<Gradient>>;
	readonly #mask: Spectacle<number>;
	readonly #maskStats: Spectacle<MaskStats>;
	readonly #pattern: Spectacle<PatternOrientation>;
	readonly #stats: Spectacle<InfinityStats>;
	readonly #thickness: Spectacle<number>;
	readonly #vScale: Spectacle<number>;
	public readonly px: number;
	private svg: SVGElement | undefined;

	public constructor(init: Partial<InfSpec> = {}) {
		this.#behindDeg = Spectacle.of(init.behindDeg ?? 0);
		this.#drawStrategy = Spectacle.of(init.drawStrategy ?? "filled");
		this.#gap = Spectacle.of(Math.max(-1, Math.min(1, init.gap ?? 0)));
		this.#mask = Spectacle.of(Math.max(0, Math.min(1, init.mask ?? 0)));
		this.#pattern = Spectacle.of(init.pattern ?? "queue");
		this.#thickness = Spectacle.of(init.thickness ?? 1);
		this.#vScale = Spectacle.of(init.vScale ?? 1);
		this.#gradient = Spectacle.of(init.gradient ?? GRADIENT_DEFAULT);
		this.#stats = Spectacle.compose(this.#gap, this.#thickness, (gap1, thickness01) => this.calculateStats(gap1, thickness01));
		this.#maskStats = Spectacle.compose(this.#mask, this.#stats, this.#vScale, (mask01, statsValues, vScale) => this.calculateMaskStats(mask01, statsValues, vScale));
		this.px = 1200;
	}

	public asSVG($parent: HTMLElement): RickSVG {
		const rootId = randomId();
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
		this.#stats.watch(({ gap, inner, jx, p, r, theta, thick }) => {
			setInfo($infoR, r);
			setInfo($infoGap, gap);
			setInfo($infoThick, thick);
			setInfo($infoInner, inner);
			setInfo($infoP, p);
			setInfo($infoAngle, `${ theta }°`);
			setInfo($infoJx, jx);
		});
		const gTransform = Spectacle.compose(this.#vScale, this.#maskStats, (vScale, ms) => {
			return `translate(${ ms.drawW / 2 } ${ ms.drawH / 2 }) scale(1,${ -vScale })`;
		});
		const svg = new RickSVG($parent, this.#maskStats.value.drawW, this.#maskStats.value.drawH);
		this.#maskStats.watch((ms) => {
			svg.svg.setAttributeNS(null, "viewBox", `0 0 ${ ms.drawW } ${ ms.drawH }`);
			setInfo($infoMask, ms.mask);
		});
		svg.group((g, s) => {
			gTransform.watch((transform) => {
				g.transform = transform;
			}, true);
			const leftMaskRing = s.path('<path d="" fill="black" stroke="none" />', g);
			const rightMaskRing = s.path('<path d="" fill="black" stroke="none" />', g);
			const leftMaskBar = s.rect('<rect fill="black" stroke="none" />', g);
			const rightMaskBar = s.rect('<rect fill="black" stroke="none" />', g);
			this.#maskStats.map(({ m, mask, mInner, mOuter, mix, miy, p, theta, thick, u, um, vertical }) => {
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
			Spectacle.compose(this.#gradient, this.#stats, this.#drawStrategy, this.#pattern, this.#behindDeg, (gradient, statsValues, drawStrategy, pattern, behindDeg) => {
				for (const child of Array.from(svg.defs.childNodes)) {
					svg.defs.removeChild(child);
				}
				let paths = this.generatePaths(statsValues, rootId);
				if (drawStrategy === "split" && pattern === "queue") {
					paths = this.splitPaths(paths, gradient);
				}
				this.renderPaths(paths, s, g);
				if (pattern === "behind") {
					this.paintBehind(paths, gradient, svg, rootId, statsValues.r, statsValues.gap, behindDeg);
				} else if (pattern === "lanes") {
					this.paintLanes(paths, gradient, svg, statsValues);
				} else if (drawStrategy === "split") {
					this.paintSplits(paths, g);
				} else {
					this.paintQueue(paths, gradient, g, svg);
				}
			});
		}, undefined, rootId);
		return svg;
	}

	public attachTo($el: HTMLElement): void {
		this.svg?.parentElement?.removeChild(this.svg);
		const svg = this.asSVG($el);
		this.svg = svg.svg;
	}

	private calculateMaskStats(mask01: number, statsValues: InfinityStats, vScale: number): MaskStats {
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
		const m = fix3(p * cosTheta);
		const mInner = inner - mask;
		const mOuter = r + mask;
		const um = fix3(mask / sinTheta);
		const mix = fix3(mInner * sinTheta);
		const miy = fix3(mInner * cosTheta);
		const drawH = fix3(mOuter * 2 * vScale);
		const drawW = fix3(p * 2 + mask * 2 + r * 2);
		return { drawH, drawW, m, mask, mInner, mOuter, mix, miy, p, theta, thick, u, um, vertical };
	}

	private calculateStats(gap1: number, thickness01: number): InfinityStats {
		const r = fix3(100);
		let gap = fix3(r * gap1 * thickness01);
		const thick01 = Math.max(thickness01, 0.01);
		const inner01 = 1 - thick01;
		const thick = fix3(thick01 * r);
		const inner = fix3(inner01 * r);
		const p = inner + thick + (gap / 2);
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
		const h = fix3(inner * cosTheta);
		const qOff = Math.round(inner * sinTheta);
		const q = p - qOff;
		const u = p - uOff;
		const jx = Math.round(p - (r * sinTheta));
		const jy = Math.round(r * cosTheta);
		let [ ix, iy ] = intersect([ -q, -h, jx, jy ], [ -q, h, -jx, jy ]).map((n) => n == null ? undefined : fix3(n));
		// Intersection of the rings
		// (x-p)^2 + y*y = r*r
		// y = sqrt(r*r - p*p)
		const riy = fix3(Math.sqrt(r * r - p * p));
		return { cosTheta, gap, h, inner, ix, iy, jx, jy, q, p, r, riy, sinTheta, theta, thick, u, v, vertical };
	}

	get drawSize(): PointXY {
		return [ this.#maskStats.value.drawW, this.#maskStats.value.drawH ];
	}

	private generatePaths(
		stats: InfinityStats,
		rootId: string,
	): Pathable[] {
		const { h, inner, ix, iy, jx, jy, q, p, r, riy, theta, u, v, vertical } = stats;
		const front: Pathable[] = [];
		const back: Pathable[] = [];
		if (jx < 0) {
			if (ix != null && iy != null) {
				// Triangular wedges instead of crossbars.
				front.push(new Triangle(`path-${ rootId }-nwCross`, "Underbar", -u, 0, -q, h, ix, iy));
				back.unshift(new Triangle(`path-${ rootId }-seCross`, "Underbar", u, 0, q, -h, -ix, -iy));
			} else {
				// Vertical — no crossbars.
			}
		} else if (inner === 0) {
			// Big triangular wedges
			front.push(new Triangle(`path-${ rootId }-nwCross`, "Underbar", -jx, jy, 0, v, -p, 0));
			back.unshift(new Triangle(`path-${ rootId }-seCross`, "Underbar", jx, -jy, 0, -v, p, 0, undefined, true));
		} else {
			// Normal rectangles.
			front.push(new Quad(`path-${ rootId }-nwCross`, "Underbar", -u, -0.5, -q, h, -jx, jy, 0.5, v));
			back.unshift(new Quad(`path-${ rootId }-seCross`, "Underbar", u, 0, q, -h, jx, -jy, 0, -v));
		}
		if (vertical) {
			// bigCross.d = "";
			front.push(new Neck(`path-${ rootId }-nwNeck`, "LRing", {
				bi: [ -p + inner, 0 ],
				bo: [ 0, riy ],
				ei: [ -p, inner ],
				eo: [ -p, r ],
				ri: inner,
				ro: r,
				si: [ -p + inner, 0 ],
				sm: [ -p + inner, 0 ],
			}));
			front.push(new Arc(`path-${ rootId }-leftArc`, "LRing", -p, 0, inner, r, 90, 180 + theta));
			back.unshift(new Neck(`path-${ rootId }-seNeck`, "RRing", {
				bi: [ p - inner, 0 ],
				bo: [ 0, -riy ],
				ei: [ p, -inner ],
				eo: [ p, -r ],
				ri: inner,
				ro: r,
				si: [ p - inner, 0 ],
				sm: [ p - inner, 0 ],
			}));
			back.unshift(new Arc(`path-${ rootId }-rightArc`, "RRing", p, 0, inner, r, 90 + theta, -180 - theta, true));
		} else {
			if (jx < 0) {
				front.push(new Neck(`path-${ rootId }-nwNeck`, "LRing", {
					bi: [ jx, jy ],
					bo: [ 0, riy ],
					ei: [ -p, inner ],
					eo: [ -p, r ],
					ri: inner,
					ro: r,
					si: [ -q, h ],
					sm: [ ix ?? -q, iy ?? h ],
				}));
				front.push(new Arc(`path-${ rootId }-leftArc`, "LRing", -p, 0, inner, r, 90, 180 + theta));
				back.unshift(new Neck(`path-${ rootId }-seNeck`, "RRing", {
					bi: [ -jx, -jy ],
					bo: [ 0, -riy ],
					ei: [ p, -inner ],
					eo: [ p, -r ],
					ri: inner,
					ro: r,
					si: [ q, -h ],
					sm: [ ix == null ? q : -ix, iy == null ? -h : -iy ],
				}));
				back.unshift(new Arc(`path-${ rootId }-rightArc`, "RRing", p, 0, inner, r, 90 + theta, -180 - theta, true));
			} else {
				front.push(new Arc(`path-${ rootId }-leftArc`, "LRing", -p, 0, inner, r, 90 - theta, 180 + (2 * theta)));
				back.unshift(new Arc(`path-${ rootId }-rightArc`, "RRing", p, 0, inner, r, 90 + theta, -180 - (2 * theta), true));
			}
			front.push(new Quad(`path-${ rootId }-bigCross`, "Overbar", -q, -h, jx, jy, q, h, -jx, -jy));
		}
		return front.concat(back);
	}

	private paintBehind(paths: Readonly<Pathable[]>, gradient: Readonly<Gradient>, svg: RickSVG, rootId: string, r: number, gap: number, behindDeg: number): void {
		const behindId = `behind-${ rootId }`;
		const behindFill = `url(#${ behindId })`;
		let behindEl = svg.defs.querySelector(`#${ behindId }`) as SVGLinearGradientElement | null;
		if (behindEl == null) {
			const measured = measureGradient(gradient)
			const lg = svg.linearGradient(measured, [ 0, r ], [ 0, -r ], behindId);
			lg.gradientUnits = "userSpaceOnUse";
			behindEl = lg.$el;
		}
		const sinBehind = Math.abs(Math.sin(radFromDeg(behindDeg)));
		const scaleY = fix3(1 + sinBehind + ((sinBehind * gap) / (r * 2)));
		behindEl.setAttributeNS(null, "gradientTransform", `rotate(${ behindDeg } 0 0) scale(1 ${ scaleY })`);
		for (const path of paths) {
			const $el = svgProxy<SVGPathElement>(svg.svg.querySelector(`#${ path.id }`)!);
			$el.fill = behindFill;
			$el.stroke = "none";
			$el[ "stroke-width" ] = 0;
		}
	}

	private paintLanes(paths: Pathable[], gradient: Readonly<Gradient>, svg: RickSVG, stats: InfinityStats): void {
		const { inner, p, r, theta, thick } = stats;
		const halfThick = fix3(thick / 2);
		const forward = measureGradient(gradient);
		const reversed = reverseGradient(forward);
		const underbar = svg.linearGradient(reversed, [ 0, -halfThick ], [ 0, halfThick ]);
		underbar.gradientTransform = `rotate(${ fix3(-theta) })`;
		const overbar = svg.linearGradient(forward, [ 0, -halfThick ], [ 0, halfThick ]);
		overbar.gradientTransform = `rotate(${ fix3(theta) })`;
		const lRing = svg.radialGradient(reversed, [ -p, 0 ], [ inner, r ]);
		const rRing = svg.radialGradient(forward, [ p, 0 ], [ inner, r ]);
		const partFills: Record<DrawPart, string> = {
			LRing: lRing.id,
			Overbar: overbar.id,
			RRing: rRing.id,
			Underbar: underbar.id,
		};
		for (const path of paths) {
			const $el = svgProxy<SVGElement>(svg.svg.querySelector(`#${ path.id }`)!);
			const fill = `url(#${ partFills[ path.drawPart ] })`;
			$el.fill = fill;
			const stroke = path.stroke(fill);
			$el.stroke = typeof stroke === "string" ? stroke : stroke[ 0 ];
			$el[ "stroke-width" ] = typeof stroke === "string" ? 0 : stroke[ 1 ];
		}
	}

	private paintQueue(paths: Pathable[], gradient: Readonly<Gradient>, g: SVGElementProxy<SVGGElement>, svg: RickSVG): void {
		const totalLength = fix3(paths.reduce((p, c) => p + c.length, 0));
		let pathStart = 0;
		let pathStart100 = 0;
		const grad = measureGradient(gradient);
		for (const path of paths) {
			const pathEnd = pathStart + path.length;
			const pathEnd100 = fix3(100 * pathEnd / totalLength);
			const pathWidth100 = pathEnd100 - pathStart100;
			const scale100 = 100 / pathWidth100;
			const colors = grad.filter(([ _c, gStart100, gEnd100 ]) => (pathStart100 >= gStart100 && pathStart100 <= gEnd100) || (pathEnd100 >= gStart100 && pathEnd100 <= gEnd100) || (pathStart100 <= gStart100 && pathEnd100 >= gEnd100))
				.map(([ c, s, e ]): MeasuredGradientSegment => [ c, fix3(Math.max(0, (s - pathStart100) * scale100)), fix3(Math.min(100, (e - pathStart100) * scale100)) ]);
			if (colors.length < 1) {
				console.warn("No colors for path", { path, startPercent100: pathStart100, endPercent100: pathEnd100, widthPercent100: pathWidth100, scale100, grad });
				continue;
			}
			path.toFilledPath(colors, svg, g);
			pathStart = pathEnd;
			pathStart100 = pathEnd100;
		}
	}

	private paintSplits(paths: Pathable[], g: SVGElementProxy<SVGGElement>): void {
		for (const path of paths) {
			const $el = svgProxy<SVGPathElement>(g.$el.querySelector(`#${ path.id }`)!);
			$el.fill = path.color;
			const stroke = path.stroke(path.color);
			$el.stroke = typeof stroke === "string" ? stroke : stroke[ 0 ];
			$el[ "stroke-width" ] = typeof stroke === "string" ? 0 : stroke[ 1 ];
		}
	}

	private renderPaths(paths: Pathable[], svg: RickSVG, g: SVGElementProxy<SVGGElement>): void {
		g.$el.innerHTML = "";
		let previous: SVGPathElement | undefined = undefined;
		const remain = new Map<string, Element>(Array.from(g.$el.querySelectorAll("[id]")).map((path) => [ path.id, path ]));
		for (const path of paths) {
			remain.delete(path.id);
			let $el = g.$el.querySelector(`#${ path.id }`) as SVGPathElement | null;
			if ($el == null) {
				$el = svg.path(`<path d="${ path.toPath() }" id="${ path.id }" />`).$el;
				if (previous != null) {
					previous.insertAdjacentElement("afterend", $el);
				} else {
					g.$el.insertAdjacentElement("afterbegin", $el);
				}
			}
			previous = $el;
			$el.setAttributeNS(null, "d", path.toPath());
			// $el.setAttributeNS(null, "opacity", "50%");
		}
		for (const path of remain.values()) {
			path.parentNode?.removeChild(path);
		}
	}

	public setBehindDeg(deg: number): void {
		this.#behindDeg.update(deg);
	}

	public setDrawStrategy(strategy: DrawStrategy): void {
		this.#drawStrategy.update(strategy);
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

	public setPattern(pattern: PatternOrientation): void {
		this.#pattern.update(pattern);
	}

	public setThickness(thickness: number): void {
		this.#thickness.update(thickness);
	}

	public setVScale(vScale: number): void {
		this.#vScale.update(vScale);
	}

	private splitPaths(
		paths: Readonly<Pathable[]>,
		gradient: Readonly<Gradient>,
	): Pathable[] {
		const totalLength = fix3(paths.reduce((p, c) => p + c.length, 0));
		let atLength = 0;
		let goal100 = 0;
		let colorsRemain = gradient.length;
		let lastColor = "transparent";
		const splits: Pathable[] = [];
		const p = paths.slice();
		for (const [ color, percent100 ] of gradient) {
			lastColor = color;
			colorsRemain--;
			goal100 += percent100;
			const goalLength = fix3((goal100 / 100) * totalLength);
			while (atLength < goalLength && p.length > 0) {
				const path = p.shift()!;
				let toRender: Pathable = path;
				if ((path.length + atLength) > goalLength) {
					const needLength = fix3(goalLength - atLength);
					const percent01 = fix3(needLength / path.length);
					if (percent01 > 0.02) {
						const subs = path.split(percent01);
						if (subs != null) {
							toRender = subs.shift()!;
							while (subs.length > 0) {
								p.unshift(subs.pop()!);
							}
						}
					}
				}
				splits.push(toRender);
				toRender.color = color;
				atLength += toRender.length;
				if (atLength < goalLength && ((goalLength - atLength) / goalLength) < 0.05) {
					if (colorsRemain > 0 || p.length === 0) {
						break; // continue on to next color
					}
				}
			}
		}
		for (const path of p) {
			path.color = lastColor;
			splits.push(path);
		}
		return splits;
	}

	get svgData(): string {
		return this.svg?.parentElement?.innerHTML ?? "";
	}
}
