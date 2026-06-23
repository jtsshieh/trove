import { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	typedRoutes: true,
	serverExternalPackages: [
		'argon2',
		'@prisma/adapter-pg',
		'@anthropic-ai/claude-agent-sdk',
		'@huggingface/transformers',
		'onnxruntime-node',
		'sharp',
		// Spawns worker threads and resolves the worker file by path — must not be
		// bundled. The image worker pool (image-pool.server.ts) loads it.
		'piscina',
	],
	// Native modules loaded via dlopen at runtime are missed by Next's standalone
	// tracer, so include them explicitly: argon2's prebuild and sharp's libvips
	// `.so` (shipped in @img/sharp-libvips-linux-*). The @img/sharp globs match
	// whatever the build platform installed — linux-arm64 locally, linux-x64 on the
	// NAS — so this stays architecture-agnostic. Runner is glibc (node:24-slim).
	outputFileTracingIncludes: {
		'/': [
			// The image worker is loaded at runtime by Piscina via an absolute path
			// (process.cwd()/workers/...), so Next's tracer never sees it. Ship it
			// explicitly; Node runs the .ts directly via native type stripping.
			'./workers/**/*',
			'./node_modules/argon2/prebuilds/linux-arm64/*',
			'./node_modules/argon2/prebuilds/linux-x64/*',
			'./node_modules/@img/**/*',
			'./node_modules/sharp/**/*',
			// onnxruntime-node's binding.node dlopens libonnxruntime.so.1, which the
			// tracer also drops (used by inpaint and @huggingface/transformers).
			'./node_modules/onnxruntime-node/**/*',
			// The Claude Agent SDK spawns a native CLI binary shipped in a per-platform
			// optional package; the tracer drops it (it's spawned, not required).
			'./node_modules/@anthropic-ai/claude-agent-sdk-linux-arm64/**/*',
			'./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/**/*',
		],
	},
};

export default nextConfig;
