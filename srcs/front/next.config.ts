import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // O browser fala só com o Next (/api/...), que reencaminha para a API.
  // Assim o cookie de sessão é do mesmo domínio e não há CORS.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
