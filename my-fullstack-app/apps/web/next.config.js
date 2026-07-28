import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

const nextConfig = {
  turbopack: {
    root: path.join(appDir, "../.."),
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
