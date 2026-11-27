/**
 * Sirve la web (ficheros de ../dist) y /.well-known/assetlinks.json, que vincula este dominio con la app Android
 * para que se abra a pantalla completa. Las huellas SHA-256 del certificado se guardan en el KV ("android-fingerprints").
 */
export interface Env { ASSETS: Fetcher; DATA: KVNamespace }
export const PACKAGE = 'io.github.lorennsw.trenavis';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/.well-known/assetlinks.json') {
      const fps = (await env.DATA.get('android-fingerprints', 'json') as string[] | null) ?? [];
      return Response.json([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: PACKAGE, sha256_cert_fingerprints: fps } }],
        { headers: { 'cache-control': 'public, max-age=3600' } });
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
