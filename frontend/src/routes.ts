import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("como-funciona", "routes/how-it-works.tsx"),
  route("privacidade", "routes/privacy.tsx"),
] satisfies RouteConfig;
