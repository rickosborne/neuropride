export type HydrateGetAttr = ($el: HTMLElement, attrName: string) => string | Record<string, string> | undefined | null;

export type HydrateSetAttr = ($el: HTMLElement, value: string, attrName: string) => void;

export interface HydrateType {
	getAttr: HydrateGetAttr;
	setAttr: HydrateSetAttr;
}

const attributeHydrator: HydrateType = {
	getAttr: ($el) => {
		const attrs = $el.getAttribute("data-attrs");
		if (attrs == null) return undefined;
		return /** @type {{[string]: string}} */ Object.fromEntries(attrs.split(/\s+/).map((pair) => pair.split("=")));
	},
	setAttr: ($el, value, attrName) => {
		$el.setAttribute(attrName, value);
	},
};

const innerHtmlHydrator: HydrateType = {
	getAttr: ($el) => $el.getAttribute("data-html"),
	setAttr: ($el, value) => {
		$el.innerHTML = value;
	},
};

const innerTextHydrator: HydrateType = {
	getAttr: ($el) => $el.getAttribute("data-text"),
	setAttr: ($el, value) => {
		$el.innerText = value;
	},
};

export const HYDRATE_TYPES: Readonly<Record<string, HydrateType>> = Object.freeze({
	attrs: attributeHydrator,
	html: innerHtmlHydrator,
	text: innerTextHydrator,
});

export const hydrateFn = ($tpl: HTMLTemplateElement, $parent?: HTMLElement) => {
	return (params: Record<string, string> = {}): HTMLElement => {
		const $clone = $tpl.content.cloneNode(true) as HTMLElement;
		for (const [ type, { getAttr, setAttr } ] of Object.entries(HYDRATE_TYPES)) {
			const attrName = `data-${ type }`;
			Array.from($clone.querySelectorAll(`[${ attrName }]`) as NodeListOf<HTMLElement> ?? []).forEach(($el: HTMLElement) => {
				const nameOrNames = getAttr($el, type);
				if (typeof nameOrNames === "string") {
					const value = params[ nameOrNames ];
					if (value != null) {
						setAttr($el, value, nameOrNames);
					}
				} else if (nameOrNames != null) {
					for (const [ attrName, paramName ] of Object.entries(nameOrNames)) {
						const value = params[ paramName ];
						if (value != null) {
							setAttr($el, value, attrName);
						}
					}
				}
			});
		}
		if ($parent != null) {
			$parent.appendChild($clone);
		}
		return $clone;
	};
};
