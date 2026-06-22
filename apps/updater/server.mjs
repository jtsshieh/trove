import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

/**
 * Headless update supervisor. The app's admin-only System page calls this over the
 * internal Docker network (token-gated) to check for and apply updates. It holds
 * the Docker socket + a bind-mount of the repo, so it can git-pull, rebuild, run
 * migrations, and restart the app — none of which a container can do to itself.
 *
 * Endpoints (all require header `x-updater-token`):
 *   GET  /status  -> current HEAD + deploy state + live log
 *   POST /check   -> fetch origin and report whether the branch is behind
 *   POST /update  -> pull, build, migrate, restart (async; poll /status for progress)
 */

const PORT = Number(process.env.PORT ?? 9000);
const TOKEN = process.env.UPDATER_TOKEN;
const REPO_DIR = process.env.REPO_DIR ?? process.cwd();
const COMPOSE_FILE = process.env.COMPOSE_FILE ?? 'deploy/compose.prod.yaml';
const ENV_FILE = process.env.ENV_FILE ?? 'deploy/.env';
const BRANCH = process.env.DEPLOY_BRANCH ?? 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DEPLOY_STATE_FILE = path.join(REPO_DIR, '.deploy-state.json');
const MAX_LOG_LINES = 1000;
const UNIT = ''; // field separator for git pretty output

const state = {
	/** 'idle' | 'updating' | 'error' */
	stage: 'idle',
	log: [],
	error: null,
	updatedAt: null,
};

function pushLog(chunk) {
	for (const line of String(chunk).split('\n')) {
		if (line.length) state.log.push(line);
	}
	if (state.log.length > MAX_LOG_LINES) {
		state.log.splice(0, state.log.length - MAX_LOG_LINES);
	}
}

/** Inject read-only auth for private GitHub HTTPS pulls without persisting it. */
function gitArgs(args) {
	if (GITHUB_TOKEN) {
		return [
			'-c',
			`url.https://x-access-token:${GITHUB_TOKEN}@github.com/.insteadOf=https://github.com/`,
			...args,
		];
	}
	return args;
}

/** Run a command in REPO_DIR. Streams to the log unless `capture` (then returns stdout). */
function run(cmd, args, { capture = false } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd: REPO_DIR, env: process.env });
		let out = '';
		child.stdout.on('data', (d) => {
			const s = d.toString();
			if (capture) out += s;
			else pushLog(s);
		});
		child.stderr.on('data', (d) => {
			const s = d.toString();
			if (capture) out += s;
			else pushLog(s);
		});
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0
				? resolve(out)
				: reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)),
		);
	});
}

function readDeployState() {
	try {
		return JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
	} catch {
		return { deployedSha: null, updatedAt: null };
	}
}

function writeDeployState(sha) {
	const data = { deployedSha: sha, updatedAt: new Date().toISOString() };
	try {
		fs.writeFileSync(DEPLOY_STATE_FILE, `${JSON.stringify(data, null, 2)}\n`);
	} catch (e) {
		pushLog(`[warn] could not write deploy state: ${e}`);
	}
}

async function headInfo() {
	try {
		const sha = (
			await run('git', ['rev-parse', 'HEAD'], { capture: true })
		).trim();
		const subject = (
			await run('git', ['log', '-1', '--pretty=%s'], { capture: true })
		).trim();
		const committedAt = (
			await run('git', ['log', '-1', '--pretty=%cI'], { capture: true })
		).trim();
		return { sha, shaShort: sha.slice(0, 7), subject, committedAt };
	} catch {
		return { sha: '', shaShort: '', subject: '(unknown)', committedAt: null };
	}
}

async function buildStatus() {
	const current = await headInfo();
	const deploy = readDeployState();
	return {
		state: state.stage,
		branch: BRANCH,
		current,
		deployedSha: deploy.deployedSha,
		log: state.log,
		updatedAt: state.updatedAt,
		error: state.error,
	};
}

async function check() {
	await run('git', gitArgs(['fetch', 'origin', BRANCH]), { capture: true });
	const current = (
		await run('git', ['rev-parse', 'HEAD'], { capture: true })
	).trim();
	const latest = (
		await run('git', ['rev-parse', `origin/${BRANCH}`], { capture: true })
	).trim();
	const behindBy =
		parseInt(
			(
				await run('git', ['rev-list', '--count', `HEAD..origin/${BRANCH}`], {
					capture: true,
				})
			).trim(),
			10,
		) || 0;
	let changelog = [];
	if (behindBy > 0) {
		const out = await run(
			'git',
			['log', `--pretty=%h${UNIT}%s`, `HEAD..origin/${BRANCH}`],
			{ capture: true },
		);
		changelog = out
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const [sha, ...rest] = line.split(UNIT);
				return { sha, subject: rest.join(UNIT) };
			});
	}
	return {
		updateAvailable: behindBy > 0,
		behindBy,
		currentShaShort: current.slice(0, 7),
		latestShaShort: latest.slice(0, 7),
		changelog,
	};
}

async function doUpdate() {
	state.stage = 'updating';
	state.error = null;
	state.log = [];
	state.updatedAt = new Date().toISOString();
	pushLog(`[update] starting on branch ${BRANCH}`);
	try {
		pushLog('[update] git pull');
		await run('git', gitArgs(['pull', '--ff-only', 'origin', BRANCH]));
		pushLog('[update] building images');
		await run('docker', [
			'compose',
			'--env-file',
			ENV_FILE,
			'-f',
			COMPOSE_FILE,
			'build',
			'app',
			'migrate',
			'edge',
		]);
		pushLog('[update] applying migrations');
		await run('docker', [
			'compose',
			'--env-file',
			ENV_FILE,
			'-f',
			COMPOSE_FILE,
			'run',
			'--rm',
			'migrate',
		]);
		pushLog('[update] restarting app');
		await run('docker', [
			'compose',
			'--env-file',
			ENV_FILE,
			'-f',
			COMPOSE_FILE,
			'up',
			'-d',
			'--no-deps',
			'app',
			'edge',
		]);
		const sha = (
			await run('git', ['rev-parse', 'HEAD'], { capture: true })
		).trim();
		writeDeployState(sha);
		state.stage = 'idle';
		pushLog('[update] complete');
	} catch (e) {
		state.stage = 'error';
		state.error = String(e?.message ?? e);
		pushLog(`[update] FAILED: ${state.error}`);
	}
}

function sendJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

const server = http.createServer(async (req, res) => {
	try {
		if (!TOKEN)
			return sendJson(res, 500, { error: 'UPDATER_TOKEN not configured' });
		if (req.headers['x-updater-token'] !== TOKEN) {
			return sendJson(res, 401, { error: 'Unauthorized' });
		}

		const url = new URL(req.url, 'http://localhost');
		const route = `${req.method} ${url.pathname}`;

		if (route === 'GET /status') {
			return sendJson(res, 200, await buildStatus());
		}
		if (route === 'POST /check') {
			return sendJson(res, 200, await check());
		}
		if (route === 'POST /update') {
			if (state.stage === 'updating') {
				return sendJson(res, 409, { error: 'Update already in progress' });
			}
			void doUpdate(); // fire-and-forget; client polls /status
			return sendJson(res, 202, await buildStatus());
		}
		return sendJson(res, 404, { error: 'Not found' });
	} catch (e) {
		return sendJson(res, 500, { error: String(e?.message ?? e) });
	}
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(
		`updater listening on :${PORT} (repo=${REPO_DIR}, branch=${BRANCH})`,
	);
});
