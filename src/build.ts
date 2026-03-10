import { ancestor, byId } from "./dom-like.js";
import type { PointXY } from "./geometry.js";
import { asDrawStrategy, asPatternOrientation, NeuroPrideInf } from "./infinity.js";
import { PALETTES } from "./palettes.js";
import { hydrateFn } from "./templates.js";

const maybeNum = (value?: string | undefined, type: "float" | "int" = "float"): number | undefined => {
	if (value != null) {
		return type === "int" ? Number.parseInt(value, 10) : Number.parseFloat(value);
	}
	return undefined;
};

const radioSetter = ($parent: HTMLElement, setter: (value: string | undefined) => void) => {
	let alreadyChecked: HTMLInputElement | undefined;
	for (const radio of Array.from($parent.querySelectorAll("input[type=radio]") as NodeListOf<HTMLInputElement>)) {
		if (radio.checked) {
			alreadyChecked = radio;
		}
		radio.addEventListener("change", () => setter(radio.value));
	}
	if (alreadyChecked != null) {
		setter(alreadyChecked.value);
	}
};

document.addEventListener("DOMContentLoaded", () => {
	const $colorOptions = byId("color-options", HTMLElement);
	const $drawStrategyOptions = byId("draw-strategy-options", HTMLElement);
	const $patternOptions = byId("pattern-options", HTMLElement);
	const $bigInf = byId("big-inf", HTMLElement);
	const $tplColorOption = byId("tpl-color-option", HTMLTemplateElement);
	const $gapR = byId("gap-r", HTMLInputElement);
	const $thickR = byId("thick-r", HTMLInputElement);
	const $maskR = byId("mask-r", HTMLInputElement);
	const $vScaleR = byId("v-scale-r", HTMLInputElement);
	const $behindDeg = byId("behind-deg-r", HTMLInputElement);
	const $exportSVG = byId("export-svg", HTMLButtonElement);
	const $exportPNG = byId("export-png", HTMLButtonElement);
	let lastPalette: string = "";
	let lastPattern: string = "";
	const bigInf = new NeuroPrideInf({
		behindDeg: maybeNum($behindDeg?.value, "int"),
		gap: maybeNum($gapR?.value),
		mask: maybeNum($maskR?.value),
		thickness: maybeNum($thickR?.value),
		vScale: maybeNum($vScaleR?.value),
	});

	if ($colorOptions != null && $tplColorOption != null) {
		Array.from($colorOptions.childNodes).forEach((n) => $colorOptions.removeChild(n));
		const hydrate = hydrateFn($tplColorOption, $colorOptions);
		PALETTES.forEach((palette) => {
			const { gradient: _gradient, ...noGradient } = palette;
			const params = { ...noGradient, id: `palette-${ palette.name.replace(/[^a-zA-Z0-9]+/g, "") }` };
			hydrate(params);
		});
		radioSetter($colorOptions, (name: string | undefined) => {
			if (name != null) {
				const palette = PALETTES.find((p) => p.name === name);
				if (palette != null) {
					bigInf.setGradient(palette.gradient);
					lastPalette = palette.name;
				}
			}
		});
	}

	if ($drawStrategyOptions != null) {
		radioSetter($drawStrategyOptions, (value) => {
			if (value != null) {
				bigInf.setDrawStrategy(asDrawStrategy(value));
			}
		})
	}

	if ($patternOptions != null) {
		radioSetter($patternOptions, (value) => {
			if (value != null) {
				bigInf.setPattern(asPatternOrientation(value));
				if ($behindDeg != null) {
					$behindDeg.disabled = value !== "behind";
				}
				lastPattern = value;
			}
		})
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
		$behindDeg?.addEventListener("input", () => bigInf.setBehindDeg(Number.parseInt($behindDeg.value, 10)));
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
	$behindDeg?.addEventListener("dblclick", () => {
		$behindDeg.value = "0";
		bigInf.setBehindDeg(0);
	});
	let exporting = false;
	const setExporting = (toState: boolean) => {
		exporting = toState;
		$exportPNG!.disabled = exporting;
		$exportSVG!.disabled = exporting;
	};
	const fileName = (suffix: string, size?: PointXY | undefined) => {
		return [
			"neuropride",
			lastPalette?.replace(/[^a-zA-Z0-9]+/g, ""),
			lastPattern,
			lastPattern === "behind" ? $behindDeg?.value?.concat("deg") : "",
			size == null ? "" : `${ size[ 0 ] }x${ size[ 1 ] }`,
		].filter((p) => p != null && p !== "").join("-").concat(suffix);
	};
	$exportSVG?.addEventListener("click", (ev) => {
		ev.stopPropagation();
		if (exporting) {
			return false;
		}
		setExporting(true);
		const svg = bigInf.svgData;
		const a = document.createElement("a");
		a.setAttributeNS(null, "href", "data:image/svg;charset=utf-8,".concat(encodeURIComponent(svg)));
		a.setAttributeNS(null, "download", fileName(".svg"));
		a.style.display = "none";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => setExporting(false), 1_000);
		return false;
	});
	$exportPNG?.addEventListener("click", (ev) => {
		ev.stopPropagation();
		if (exporting) {
			return false;
		}
		setExporting(true);
		const cvs = document.createElement("canvas");
		const dpr = (window.devicePixelRatio ?? 2) * 2;
		const [ w, h ] = bigInf.drawSize;
		const sw = Math.floor(w * dpr);
		const sh = Math.floor(h * dpr);
		console.log([ w, h, dpr, sw, sh ]);
		cvs.style.width = `${ w }px`;
		cvs.style.height = `${ h }px`;
		cvs.width = sw;
		cvs.height = sh;
		document.body.appendChild(cvs);
		console.log("created canvas", cvs);
		const ctx = cvs.getContext("2d", { alpha: true });
		if (ctx == null) {
			console.error("Could not get a canvas context");
			return;
		}
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
		console.log("creating image");
		const img = new Image(sw, sh);
		document.body.appendChild(img);
		const svgData = bigInf.svgData;
		const svgUrl = URL.createObjectURL(new Blob([ svgData ], { type: "image/svg+xml;charset=utf-8" }));
		img.addEventListener("load", () => {
			console.log("img load");
			ctx.drawImage(img, 0, 0, sw, sh);
			cvs.toBlob((blob) => {
				if (blob == null) {
					console.error("No blob");
					return;
				}
				const dataUrl = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.setAttributeNS(null, "href", dataUrl);
				a.setAttributeNS(null, "download", fileName(".png", [ sw, sh ]));
				a.style.display = "none";
				document.body.appendChild(a);
				a.click();
				URL.revokeObjectURL(svgUrl);
				URL.revokeObjectURL(dataUrl);
				document.body.removeChild(a);
				document.body.removeChild(img);
				document.body.removeChild(cvs);
				setTimeout(() => setExporting(false), 1_000);
			}, "image/png");
		});
		img.addEventListener("error", (ev) => {
			console.error("Failed to load SVG into an Image", ev);
		});
		img.src = svgUrl;
		return false;
	});
});
