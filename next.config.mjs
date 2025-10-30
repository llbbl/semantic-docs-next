import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle JSR imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };

    // Exclude .map files from JSR packages
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
    });

    // Exclude native .node files from webpack
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Externalize onnxruntime-node and optional dependencies for server-side only
    if (isServer) {
      config.externals = [
        ...config.externals,
        'onnxruntime-node',
        '@xenova/transformers',
        '@google/generative-ai',
        'openai',
      ];
    }

    // Replace optional JSR imports with empty modules
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /\.\/@google\/generative-ai$/,
        path.resolve(__dirname, 'src/lib/empty-module.js'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /\.\/openai$/,
        path.resolve(__dirname, 'src/lib/empty-module.js'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /\.\/winston$/,
        path.resolve(__dirname, 'src/lib/empty-module.js'),
      ),
    );

    return config;
  },
  transpilePackages: ['@jsr/logan__logger', '@jsr/logan__libsql-search'],
};

export default nextConfig;
