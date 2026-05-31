import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PapaParse / SheetJS are CommonJS; load from node_modules on the server.
  serverExternalPackages: ['papaparse', 'xlsx'],
};

export default nextConfig;
