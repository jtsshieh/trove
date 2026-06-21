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
	],
	// argon2's native prebuild is loaded dynamically, so Next's tracer misses it.
	// Include all prebuilds for the Linux arches we deploy on; the runner is now
	// glibc (node:24-slim), so the glibc binaries are what actually load at runtime.
	outputFileTracingIncludes: {
		'/': [
			'./node_modules/argon2/prebuilds/linux-arm64/*',
			'./node_modules/argon2/prebuilds/linux-x64/*',
		],
	},
};

export default nextConfig;
