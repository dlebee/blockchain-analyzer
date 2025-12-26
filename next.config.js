const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add empty turbopack config to silence the warning when using webpack
  turbopack: {},
  // Exclude coingecko-typescript submodule from compilation
  webpack: (config, { isServer }) => {
    // Ignore the submodule directory completely
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : []),
        '**/coingecko-typescript/**',
      ],
    }
    
    // Add rule to ignore files in coingecko-typescript directory
    config.module.rules.push({
      test: (filePath) => {
        return filePath.includes(path.join(process.cwd(), 'coingecko-typescript'))
      },
      use: 'ignore-loader',
    })
    
    return config
  },
  // Exclude submodule from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

