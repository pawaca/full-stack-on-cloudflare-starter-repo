import type { LinkSchemaType } from '@repo/data-ops/zod-schema/links';

// 缓存 TTL（秒）
const CACHE_TTL_SECONDS = 3600; // 1 小时

/**
 * 从 KV 缓存或数据库获取链接信息
 * 实现缓存优先策略：KV 缓存 -> D1 数据库 -> 回写缓存
 */
export async function getLinkInfoFromKV(
	cache: KVNamespace,
	db: D1Database,
	linkId: string
): Promise<LinkSchemaType | null> {
	const cacheKey = `link:${linkId}`;

	// Step 1: 检查 KV 缓存
	try {
		const cached = await cache.get(cacheKey);
		if (cached) {
			const parsed = JSON.parse(cached);
			// 验证缓存数据格式是否正确
			if (parsed && typeof parsed.linkId === 'string') {
				return parsed as LinkSchemaType;
			}
		}
	} catch {
		// 缓存读取失败，继续查询数据库
	}

	// Step 2: 缓存未命中，回源数据库查询
	const result = await db
		.prepare(
			'SELECT link_id, account_id, name, destinations, created, updated FROM links WHERE link_id = ?'
		)
		.bind(linkId)
		.first<{
			link_id: string;
			account_id: string;
			name: string;
			destinations: string;
			created: string;
			updated: string;
		}>();

	if (!result) {
		return null;
	}

	const linkInfo: LinkSchemaType = {
		linkId: result.link_id,
		accountId: result.account_id,
		name: result.name,
		destinations: JSON.parse(result.destinations),
		created: result.created,
		updated: result.updated,
	};

	// Step 3: 回写缓存，设置 TTL
	try {
		await cache.put(cacheKey, JSON.stringify(linkInfo), {
			expirationTtl: CACHE_TTL_SECONDS,
		});
	} catch {
		// 缓存写入失败，不影响主流程
	}

	return linkInfo;
}

/**
 * 根据国家代码获取目标 URL
 */
export function getDestinationForCountry(
	linkInfo: LinkSchemaType,
	countryCode?: string
): string {
	if (!countryCode) {
		return linkInfo.destinations.default;
	}

	// Check if the country code exists in destinations
	if (linkInfo.destinations[countryCode]) {
		return linkInfo.destinations[countryCode];
	}

	// Fallback to default
	return linkInfo.destinations.default;
}
