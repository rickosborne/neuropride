import { ancestor, byId } from "./dom-like.js";
import { NeuroPrideInf } from "./infinity.js";
import { PALETTES } from "./palettes.js";
import { hydrateFn } from "./templates.js";

const maybeFloat = (value?: string | undefined): number | undefined => {
	if (value != null) {
		return Number.parseFloat(value);
	}
	return undefined;
};

document.addEventListener("DOMContentLoaded", () => {
	const $colorOptions = byId("color-options", HTMLElement);
	const $bigInf = byId("big-inf", HTMLElement);
	const $tplColorOption = byId("tpl-color-option", HTMLTemplateElement);
	const $gapR = byId("gap-r", HTMLInputElement);
	const $thickR = byId("thick-r", HTMLInputElement);
	const $maskR = byId("mask-r", HTMLInputElement);
	const $vScaleR = byId("v-scale-r", HTMLInputElement);
	const bigInf = new NeuroPrideInf({
		gap: maybeFloat($gapR?.value),
		mask: maybeFloat($maskR?.value),
		thickness: maybeFloat($thickR?.value),
		vScale: maybeFloat($vScaleR?.value),
	});

	if ($colorOptions != null && $tplColorOption != null) {
		Array.from($colorOptions.childNodes).forEach((n) => $colorOptions.removeChild(n));
		const hydrate = hydrateFn($tplColorOption, $colorOptions);
		PALETTES.forEach((palette) => {
			const { gradient: _gradient, ...noGradient } = palette;
			const params = { ...noGradient, id: `palette-${ palette.name.replace(/[^a-zA-Z0-9]+/g, "") }` };
			hydrate(params);
		});
		let alreadyChecked: HTMLInputElement | undefined;
		const setColor = (name?: string | undefined) => {
			if (name != null) {
				const palette = PALETTES.find((p) => p.name === name);
				if (palette != null) {
					bigInf.setGradient(palette.gradient);
				}
			}
		};
		for (const radio of Array.from($colorOptions.querySelectorAll("input[type=radio]") as NodeListOf<HTMLInputElement>)) {
			if (radio.checked) {
				alreadyChecked = radio;
			}
			radio.addEventListener("change", () => setColor(radio.value));
		}
		if (alreadyChecked != null) {
			setColor(alreadyChecked.value);
		}
	}

	(() => {
		const lastInGroup = new Map<string, HTMLTableRowElement>();
		Array.from(document.querySelectorAll("tr input[type=radio]") as NodeListOf<HTMLInputElement> ?? []).forEach(($radio: HTMLInputElement) => {
			const $tr = ancestor($radio, HTMLTableRowElement);
			if ($tr != null) {
				$radio.addEventListener("change", (ev) => {
					const $last = lastInGroup.get($radio.name);
					if ($last != null) {
						$last.classList.remove("selected");
					}
					lastInGroup.set($radio.name, $tr);
					$tr.classList.add("selected");
					ev.stopPropagation();
				});
			}
		});
	})();

	if ($bigInf != null) {
		bigInf.attachTo($bigInf);
		$thickR?.addEventListener("input", () => bigInf.setThickness(Number.parseFloat($thickR.value)));
		$gapR?.addEventListener("input", () => bigInf.setGap(Number.parseFloat($gapR.value)));
		$maskR?.addEventListener("input", () => bigInf.setMask(Number.parseFloat($maskR.value)));
		$vScaleR?.addEventListener("input", () => bigInf.setVScale(Number.parseFloat($vScaleR.value)));
	}
	$thickR?.addEventListener("dblclick", () => {
		$thickR.value = "0.5";
		bigInf.setThickness(0.5);
	});
	$gapR?.addEventListener("dblclick", () => {
		$gapR.value = "0";
		bigInf.setGap(0);
	});
	$maskR?.addEventListener("dblclick", () => {
		$maskR.value = "0.5";
		bigInf.setMask(0.5);
	});
	$vScaleR?.addEventListener("dblclick", () => {
		$vScaleR.value = "1";
		bigInf.setVScale(1);
	});
});
