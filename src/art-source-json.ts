import { z } from "zod";

export const ART_SOURCE_VERSION = "2028-02-28";

export const zId = z.string().regex(/^\P{ID_Start}\P{ID_Continue}*$/u);

export const zLocale = z.string().regex(/^[a-z]{2}(?:-[a-z]+)?$/i);

export const zLocalization = z.record(zLocale, z.string());

export const zColor = z.string().regex(/^#?[a-f0-9]{6,8}|hsl\(\d+(?:deg)?\s+\d+%\s+\d+%(?:\s+\/\s+\d+%)?$/i)

const zTitled = z.object({
	id: zId,
	localized: zLocalization.optional(),
	title: z.string(),
});

export const zArtShape = zTitled.extend({
});

export const zColorScheme = zTitled.extend({
	colors: zColor.array(),
});

export const zArtDesign = zTitled.extend({
	colorSchemes: z.record(zId, zColorScheme),
	shapes: zId.array(),
});

export const zArtSourceJson = zTitled.extend({
	$version: z.literal(ART_SOURCE_VERSION),
	designs: zArtDesign.array(),
	locale: zLocale.optional(),
	shapes: zArtShape.array(),
}).describe("emoji source JSON");

export type ArtSourceJson = z.output<typeof zArtSourceJson>;
