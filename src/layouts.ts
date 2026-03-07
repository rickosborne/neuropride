interface LineShape {
	type: "line";
}

interface ArcShape {
	type: "arc";
}

export interface Layout {
	name: string;
	shapes?: (LineShape | ArcShape)[];
	slots: number;
}

const mono: Layout = {
	name: "mono",
	shapes: [ {
		type: "line",
	}, {
		type: "arc",
	}, {
		type: "line",
	}, {
		type: "arc",
	}, {
		type: "line",
	} ],
	slots: 1,
};

export const LAYOUTS: Layout[] = [
	mono, {
		name: "2x",
		slots: 2,
	}, {
		name: "3x",
		slots: 3,
	}, {
		name: "4x",
		slots: 4,
	}, {
		name: "5x",
		slots: 5,
	} ];
