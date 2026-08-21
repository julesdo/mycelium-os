/**
 * Platform-aware deployment script
 *
 * Supports Vercel, Cloudflare Workers/Pages, and unknown platforms.
 * Platform is auto-detected from environment variables.
 *
 * Handles:
 * - Platform detection (Vercel, Cloudflare Workers/Pages, unknown)
 * - Convex environment variable validation (production and preview)
 * - Convex deployment
 * - Preview environment setup (SITE_URL, admin seeding)
 * - E2E config file generation (preview only)
 * - Construction de l'application
 */

import { detectPlatform } from './deploy/platform';
import {
	computeBuildEnv,
	construireApplication,
	deployConvex,
	setupPreviewEnv,
	validateConvexEnv,
	writeE2eConfig
} from './deploy/steps';
import { colors } from './deploy/utils';

async function main(): Promise<void> {
	const platform = detectPlatform();

	console.log(`Platform: ${platform.platform}`);
	console.log(`Environment: ${platform.environment}`);

	// 1. Pre-deploy validation (production only; preview validated after deploy)
	if (!platform.isPreview) {
		validateConvexEnv(platform);
	}

	// 2. Deploy Convex functions
	const deployment = await deployConvex(platform);

	// 3. Preview: set SITE_URL, validate, seed admin
	if (platform.isPreview) {
		await setupPreviewEnv(deployment, platform);
	}

	// 4. Compute build env and write E2E config
	const buildEnv = computeBuildEnv(platform, deployment);
	writeE2eConfig(platform, buildEnv);

	// 5. Construire l'application
	construireApplication(buildEnv);

	console.log(`${colors.green}Deployment complete!${colors.reset}`);
}

main();
