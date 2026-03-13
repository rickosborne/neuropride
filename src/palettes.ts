import type { Gradient } from "./types.js";

export interface Palette {
	name: string;
	gradient: Gradient;
}

const progress: Palette = {
	name: "progress",
	gradient: [
		["#e40303", 9],
		["#ff8c00", 9],
		["#ffed00", 9],
		["#008026", 9],
		["#004dff", 9],
		["#750787", 10],
		["#613915", 9],
		["#111111", 9],
		["#74d7ee", 9],
		["#eeeeee", 9],
		["#ffafc8", 9],
	],
};

const androgyne: Palette = {
	name: "androgyne",
	gradient: [
		["#fe218b", 33],
		["#9800fe", 34],
		["#21b0fe", 33],
	],
};

const demiromantic: Palette = {
	name: "demiromantic",
	gradient: [
		["#eeeeee", 15],
		["#111111", 15],
		["#00a900", 40],
		["#a3a3a3", 15],
		["#eeeeee", 15],
	],
};

const polyam: Palette = {
	name: "polyamorous",
	gradient: [
		["#eeeeee", 16],
		["#fcbf00", 15],
		["#009fe3", 23],
		["#e50051", 23],
		["#811eae", 23],
	],
};

const genderfluid4: Palette = {
	name: "genderfluid (4)",
	gradient: [
		["#fa4288", 25],
		["#eeeeee", 25],
		["#71197f", 25],
		["#071195", 25],
	],
};

const genderfluid5: Palette = {
	name: "genderfluid (5)",
	gradient: [
		["#fa4288", 20],
		["#eeeeee", 20],
		["#71197f", 20],
		["#111111", 20],
		["#071195", 20],
	],
};

const genderqueer: Palette = {
	name: "genderqueer",
	gradient: [
		["#b57edc", 35],
		["#eeeeee", 30],
		["#4a8122", 35],
	],
};

const aromantic: Palette = {
	name: "aromantic",
	gradient: [
		["#3da542", 25],
		["#a7d379", 25],
		["#eeeeee", 25],
		["#a9a9a9", 25],
	],
};

const demisexual3: Palette = {
	name: "demisexual (3)",
	gradient: [
		["#eeeeee", 32],
		["#7e287f", 36],
		["#a3a3a3", 32],
	],
};

const demisexual4: Palette = {
	name: "demisexual (4)",
	gradient: [
		["#eeeeee", 15],
		["#111111", 15],
		["#a3a3a3", 40],
		["#7e287f", 15],
		["#eeeeee", 15],
	],
};

const bisexual: Palette = {
	name: "bisexual",
	gradient: [
		["#d70071", 35],
		["#9c4e97", 30],
		["#0035aa", 35],
	],
};

const asexual: Palette = {
	name: "asexual",
	gradient: [
		["#111111", 25],
		["#a3a3a3", 25],
		["#ffffff", 25],
		["#81007f", 25],
	],
};

const pansexual: Palette = {
	name: "pansexual",
	gradient: [
		["#fe218b", 35],
		["#fed700", 30],
		["#21b0fe", 35],
	],
};

const nonbinary3: Palette = {
	name: "nonbinary (3)",
	gradient: [
		["#fcf431", 35],
		["#eeeeee", 30],
		["#9d59d2", 35],
	],
};

const nonbinary4: Palette = {
	name: "nonbinary (4)",
	gradient: [
		["#fcf431", 25],
		["#eeeeee", 25],
		["#9d59d2", 25],
		["#111111", 25],
	],
};

const mentalHealth: Palette = {
	name: "mental health",
	gradient: [
		["#111d13", 25],
		["#205620", 25],
		["#76a930", 25],
		["#dccd2a", 25],
	],
};

const lesbian: Palette = {
	name: "lesbian",
	gradient: [
		["#d42c00", 20],
		["#fd9855", 20],
		["#eeeeee", 20],
		["#d161a2", 20],
		["#a20161", 20],
	],
};

const trans: Palette = {
	name: "trans",
	gradient: [
		["#55cdfd", 16],
		["#f6aab7", 24],
		["#eeeeee", 20],
		["#f6aab7", 24],
		["#55cdfd", 16],
	],
};

const agender: Palette = {
	name: "agender",
	gradient: [
		["#808080", 20],
		["#eeeeee", 20],
		["#5dcc00", 20],
		["#eeeeee", 20],
		["#808080", 20],
	],
};

const gay1979: Palette = {
	name: "gay@1979",
	gradient: [
		["#e40303", 17],
		["#ff8c00", 17],
		["#ffed00", 16],
		["#008026", 16],
		["#004dff", 17],
		["#750787", 17],
	],
};

const philadelphia: Palette = {
	name: "philadelphia",
	gradient: [
		["#111111", 12.5],
		["#784F17", 12.5],
		["#E40303", 12.5],
		["#FF8C00", 12.5],
		["#FFED00", 12.5],
		["#008026", 12.5],
		["#004DFF", 12.5],
		["#750787", 12.5],
	],
};

const polysexual: Palette = {
	name: "polysexual",
	gradient: [
		["#F61CB9", 33],
		["#07D569", 34],
		["#1C92F6", 33],
	],
};

const aroace: Palette = {
	name: "aroace",
	gradient: [
		["#E28C00", 20],
		["#ECCD00", 20],
		["#EEEEEE", 20],
		["#62AEDC", 20],
		["#203856", 20],
	],
};

export const PALETTES: readonly Palette[] = Object.freeze([
	agender,
	androgyne,
	aroace,
	aromantic,
	asexual,
	bisexual,
	demiromantic,
	demisexual3,
	demisexual4,
	gay1979,
	genderfluid4,
	genderfluid5,
	genderqueer,
	lesbian,
	mentalHealth,
	nonbinary3,
	nonbinary4,
	pansexual,
	philadelphia,
	polyam,
	polysexual,
	progress,
	trans,
]);
