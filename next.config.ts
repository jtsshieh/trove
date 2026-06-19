import { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	typedRoutes: true,
	serverExternalPackages: ['argon2', '@prisma/adapter-pg'],
	outputFileTracingIncludes: {
		'/': [
			'./node_modules/argon2/prebuilds/linux-arm64/*.musl.*',
			'./node_modules/argon2/prebuilds/linux-x64/*.musl.*',
		],
	},
};

export default nextConfig;
