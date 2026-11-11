import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("work/:id", "routes/work.tsx"),
  route("cv", "routes/cv.tsx"),
  route("imprint", "routes/imprint.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
