export interface EmojiMetaJson {
	downloaded: true;
	emoji: {
		aliases: string[];
		category: string;
		name: string;
	};
	fileName: string;
}

export interface EmojiPackMetaJson {
	emojis: EmojiMetaJson[];
	exportedAt: string;
	host: string;
	metaVersion: 2;
}
