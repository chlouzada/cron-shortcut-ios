import { CronExpressionParser } from 'cron-parser';

const TEST_TEXT = `
   * * * * * executar todo minuto
0 * * * * executar_no_inicio_da_hora
0 0 * * * executar_meia_noite
30 1 * * * executar_1_30_da_madrugada
   * * * * * executar_todo_minuto_2
   * * * * * executar_todo minuto_3
    
    `;

const parseLine = (line: string): { expr: string; name: string } => {
	const expr = line
		.split(' ')
		.map((v, idx) => (idx < 5 ? v : (null as never)))
		.filter(Boolean)
		.join(' ');

	return {
		expr,
		name: line.replace(expr + ' ', ''),
	};
};

const shouldRun = (expr: string): boolean | null => {
	try {
		const interval = CronExpressionParser.parse(expr, {
			currentDate: new Date().toISOString(),
			tz: 'America/Sao_Paulo',
		});

		// running ms after so the prev is the next
		const prev = interval.prev().toISOString();
		const now = new Date().toISOString();

		if (prev) {
			const [[a, b], [c, d]] = [now.split(':'), prev.split(':')];
			if (a + b === c + d) {
				return true;
			}
		}

		return false;
	} catch (err) {
		return null;
	}
};

export default {
	async fetch(request): Promise<Response> {
		const content = await request.text();

		const lines = (content || TEST_TEXT)
			.split('\n')
			.map((item) => item.trim())
			.filter(Boolean);

		const malformed: number[] = [];
		const runnable = lines.reduce((acc, curr, idx) => {
			if (curr.indexOf('  ') !== -1) {
				malformed.push(idx);
				return acc;
			}

			const { expr, name } = parseLine(curr);

			const check = shouldRun(expr);
			switch (check) {
				case null:
					malformed.push(idx);
				case true:
					acc.push(name);
				case false:
				default:
			}

			return acc;
		}, [] as string[]);

		const url = new URL(request.url);
		if (url.pathname === '/') {
			return new Response([...new Set(runnable)].join('\n').trim());
		} else {
			return new Response(lines.map((item, idx) => `[${malformed.includes(idx) ? 'ERROR' : 'OK'}] ${item}`).join('\n'));
		}
	},
} satisfies ExportedHandler<Env>;
