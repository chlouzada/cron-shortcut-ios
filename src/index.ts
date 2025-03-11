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

const shouldRun = (expr: string): boolean => {
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
		console.log(err);
		return false;
	}
};

export default {
	async fetch(request): Promise<Response> {
		const lines = ((await request.text()) || TEST_TEXT)
			.split('\n')
			.map((item) => item.trim())
			.filter(Boolean);

		const runnable = lines.reduce((acc, curr) => {
			if (curr.indexOf('  ') !== -1) {
				return acc;
			}

			const { expr, name } = parseLine(curr);

			if (shouldRun(expr) === true) {
				acc.push(name);
			}

			return acc;
		}, [] as string[]);

		const text = runnable.join('\n').trim();
		console.log('text', text);

		return new Response(text);
	},
} satisfies ExportedHandler<Env>;
