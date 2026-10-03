import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("como-funciona", "routes/how-it-works.tsx"),
  route("privacidade", "routes/privacy.tsx"),
  route("sorteio", "routes/draw.tsx"),
  route("sorteio/rodadas/:number", "routes/round.tsx"),
  route("sorteio/apresentacao", "routes/presentation.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
