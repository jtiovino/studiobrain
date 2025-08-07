/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable error checking during builds for production safety
  eslint: {
    // Only ignore during builds in development if needed for speed
    ignoreDuringBuilds:
      process.env.NODE_ENV === 'development' &&
      process.env.IGNORE_BUILD_ERRORS === 'true',
  },
  typescript: {
    // Only ignore build errors in development if explicitly set
    ignoreBuildErrors:
      process.env.NODE_ENV === 'development' &&
      process.env.IGNORE_BUILD_ERRORS === 'true',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
