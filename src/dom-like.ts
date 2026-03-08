export type HTMLElementFn<E extends HTMLElement> = (new () => E) & { prototype: E };

export const ancestor = <E extends HTMLElement>($el: HTMLElement, ctor: HTMLElementFn<E>): E | undefined => {
	let $current = $el.parentElement;
	while ($current != null) {
		if ($current instanceof ctor) {
			return $current;
		}
		$current = $current.parentElement;
	}
	return undefined;
};

export function byId<E extends HTMLElement>(id: string, elType: HTMLElementFn<E>): E | undefined
export function byId(id: string): HTMLElement | undefined;
export function byId<E extends HTMLElement>(id: string, elType?: HTMLElementFn<E>): E | undefined {
	const $el = document.getElementById(id);
	if (elType == null || $el instanceof elType) {
		return $el as E;
	}
	return undefined;
}

export const formatStyle = (style: Record<string, string | number>): string => {
	return Object.entries(style)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}: ${v}`)
		.join("; ");
};
