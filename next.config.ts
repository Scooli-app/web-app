import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // pptxgenjs (used in the presentation editor) references Node.js built-ins
  // (node:fs, node:https, …) that webpack cannot resolve for the browser
  // bundle.  Two-step fix:
  //   1. NormalModuleReplacementPlugin strips the "node:" prefix so bare
  //      specifiers like "fs" are used instead.
  //   2. resolve.fallback stubs those bare specifiers to `false` (empty
  //      module) for client bundles — the code paths that use them are never
  //      reached in the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: any, { isServer }: { isServer: boolean }) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NormalModuleReplacementPlugin } = require("webpack");
    // Strip "node:" URI scheme → bare specifier so fallback entries match.
    config.plugins.push(
      new NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        net: false,
        tls: false,
        https: false,
        http: false,
        http2: false,
        stream: false,
        zlib: false,
        path: false,
        os: false,
        crypto: false,
        util: false,
        events: false,
        buffer: false,
        url: false,
        querystring: false,
        string_decoder: false,
        child_process: false,
        worker_threads: false,
      };
    }

    return config;
  },

  async rewrites() {
    return [
      {
        source: "/_ph/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/_ph/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,

  // Enable experimental optimizations
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      "lucide-react",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-highlight",
      "showdown",
      "@reduxjs/toolkit",
      "react-redux",
    ],
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

export default nextConfig;
