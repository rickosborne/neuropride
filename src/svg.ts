import { randomId } from "./random-id.js";

export type SVGElementFn<E extends SVGElement> = (new () => E) & { prototype: E };

export interface SVGElementProxy<E extends SVGElement = SVGElement> {
	$el: E;
	fill: string;
	id: string;
	stroke: string;
	"stroke-width": number;
	transform: string;
}

export interface SVGCircleProxy extends SVGElementProxy<SVGCircleElement> {
	cx: number;
	cy: number;
	r: number;
}

export interface SVGPathProxy extends SVGElementProxy<SVGPathElement> {
	d: string;
}

export interface SVGRectProxy extends SVGElementProxy<SVGRectElement> {
	height: number;
	width: number;
	x: number;
	y: number;
}

/**
 * Yes, I know the DOM has all the SVG stuff, but this is a domain specific abstraction.
 */
export class RickSVG {
	readonly #scratch: SVGGElement;
	readonly svg: SVGGElement;

	constructor(
		public readonly parent: HTMLElement,
		public readonly width: number,
		public readonly height: number,
		public readonly id = randomId("svg"),
	) {
		parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ width } ${ height }" id="${ id }"><g class="scratch"></g></svg>`;
		this.svg = parent.querySelector(`#${ id }`)!;
		this.#scratch = Array.from(parent.querySelectorAll(".scratch") as NodeListOf<SVGGElement>)[ 0 ]!;
	}

	public circle(html: `<circle${ string }/>`, parent?: SVGElement | SVGElementProxy): SVGCircleProxy {
		return this.el(html, SVGCircleElement, parent);
	}

	public el<E extends SVGElement, P extends SVGElementProxy<E>>(html: `<${ string }/>`, type: SVGElementFn<E>, parent?: SVGElement | SVGElementProxy): P
	public el(html: `<${ string }/>`): SVGElementProxy;
	public el<E extends SVGElement, P extends SVGElementProxy<E>>(html: `<${ string }/>`, type?: SVGElementFn<E>, parent?: SVGElement | SVGElementProxy): P {
		this.#scratch.innerHTML = html;
		const $el = this.#scratch.firstElementChild;
		if (!($el instanceof (type ?? SVGElement))) {
			console.error({ actual: $el, expected: type });
			throw new Error(`Expected ${ (type ?? SVGElement).name }`);
		}
		$el.parentElement?.removeChild($el);
		if (parent != null) {
			("$el" in parent ? parent.$el : parent).appendChild($el);
		}
		return svgProxy($el) as P;
	}

	public group(
		block: (g: SVGElementProxy<SVGGElement>, s: RickSVG, id: string) => void,
		$parent = this.svg,
		id = randomId("g-"),
	): SVGElementProxy<SVGGElement> {
		const g = this.el(`<g id="${ id }"/>`, SVGGElement);
		$parent.appendChild(g.$el);
		block(g, this, id);
		return g;
	}

	path(html: `<path${ string }/>`, parent?: SVGElement | SVGElementProxy): SVGPathProxy {
		return this.el(html, SVGPathElement, parent);
	}

	rect(html: `<rect${ string }/>`, parent?: SVGElement | SVGElementProxy): SVGRectProxy {
		return this.el(html, SVGRectElement, parent);
	}
}

const svgProxy = <E extends SVGElement>($el: SVGElement): SVGElementProxy<E> => {
	return new Proxy({ $el } as SVGElementProxy<E>, {
		set(target, key, newValue) {
			if (typeof key !== "string") {
				console.error("Unexpected symbol");
				return false;
			}
			target.$el.setAttributeNS(null, key, String(newValue));
			return true;
		},
	});
};
