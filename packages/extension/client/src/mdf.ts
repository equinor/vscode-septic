export interface MdfData {
	file?: string;
	text1?: string;
	text2?: string;
	atext?: string;
	btext?: string;
	nsecs?: number;
	amodl?: number;
	a?: number[];
	bmodl?: number;
	b?: number[];
}

export function parseMdf(input: string): MdfData {
	const lines = input.split(/\r?\n/);
	const result: MdfData = {};
	let i = 0;

	// Helper to parse key-value lines
	function parseKeyValue(line: string) {
		const match = line.match(/^\s*([A-Za-z0-9]+)=\s*"?([^"]*)"?/);
		if (match) {
			const key = match[1].toLowerCase();
			let value: string | number = match[2].trim();
			if (key === 'nsecs' || key === 'amodl' || key === 'bmodl') {
				value = Number(value);
			}
			result[key] = value;
			return true;
		}
		return false;
	}

	// Helper to parse array of numbers
	function parseArray(startIdx: number): [number[], number] {
		const arr: number[] = [];
		let idx = startIdx;
		while (idx < lines.length) {
			const line = lines[idx].trim();
			// Stop if we hit a key-value or empty line
			if (!line || /^[A-Za-z0-9]+\s*=/.test(line)) break;
			// Stop if line is only numbers (possibly with leading spaces)
			const nums = line.match(/-?\d+(\.\d+)?([eE][-+]?\d+)?/g);
			if (nums) {
				arr.push(...nums.map(Number));
			}
			idx++;
		}
		return [arr, idx];
	}

	// Main parsing loop
	while (i < lines.length) {
		const line = lines[i].trim();
		if (!line) {
			i++;
			continue;
		}
		// File line (special comment)
		if (line.startsWith('//')) {
			const fileMatch = line.match(/File=\s*([^\s]+)/);
			if (fileMatch) result.file = fileMatch[1];
			i++;
			continue;
		}
		// Key-value
		if (parseKeyValue(line)) {
			i++;
			continue;
		}
		// Array after Amodl
		if (result.amodl && !result.a) {
			const [arr, nextIdx] = parseArray(i);
			result.a = arr;
			i = nextIdx;
			continue;
		}
		// Array after Bmodl
		if (result.bmodl && !result.b) {
			const [arr, nextIdx] = parseArray(i);
			result.b = arr;
			i = nextIdx;
			continue;
		}
		i++;
	}
	return result;
}