/**
 * GET /api/plant-care/download?t=… — hands over the file, once the token checks out.
 *
 * The built app is imported here as a string rather than read from disk or
 * served from the publish directory. That is the security property: there is no
 * URL anywhere on harvestmath.com that serves PlantCare.html, because the file
 * is not in the published output at all — it is baked into this server route's
 * bundle at build time, and the only way out of it is through a valid token.
 *
 * An unguessable path under public/ would have been one leaked link away from
 * being permanently free.
 */
import type { APIRoute } from 'astro';
import { failure, logEvent, readConfig, verifyToken } from '../../../lib/plantCarePayments';
// Vite resolves this at build time and inlines the file. `?raw` keeps it a
// string; the file lives outside public/, so it is never served statically.
import appHtml from '../../../../private/PlantCare.html?raw';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  let cfg;
  try {
    cfg = readConfig();
  } catch {
    return failure(500, 'Downloads are not configured yet.');
  }

  const result = verifyToken(cfg.downloadSecret, url.searchParams.get('t'));
  if (!result.ok) {
    logEvent('plantcare.download.refused', { reason: result.reason });
    return failure(
      403,
      result.reason === 'expired'
        ? 'That download link has expired. The updates page has a permanent one — check the email from your purchase.'
        : 'That download link is not valid.'
    );
  }

  logEvent('plantcare.download', { orderId: result.orderId });

  return new Response(appHtml, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': 'attachment; filename="PlantCare.html"',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
