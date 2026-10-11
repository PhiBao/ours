/**
 * Next.js configuration.
 *
 * Kept deliberately small. The one decision here that matters beyond defaults: Tailwind is
 * loaded as a PostCSS plugin rather than a JS plugin, because the Cloudflare Workers build
 * goes through `globalThis`, not a Node module loader.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // `node:sqlite` is used only by the local file driver. The Workers build binds D1 instead
  // and never constructs that class, but the import still has to survive bundling.
  serverExternalPackages: ["node:sqlite"],
};

export default nextConfig;