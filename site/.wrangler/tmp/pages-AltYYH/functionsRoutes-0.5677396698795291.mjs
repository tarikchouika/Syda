import { onRequestGet as __api_support__route__js_onRequestGet } from "/home/z/my-project/syda-repo/site/functions/api/support/[route].js"
import { onRequestPost as __api_support__route__js_onRequestPost } from "/home/z/my-project/syda-repo/site/functions/api/support/[route].js"
import { onRequest as __api_support__route__js_onRequest } from "/home/z/my-project/syda-repo/site/functions/api/support/[route].js"
import { onRequestPost as __api_order_js_onRequestPost } from "/home/z/my-project/syda-repo/site/functions/api/order.js"
import { onRequestPost as __api_telegram_js_onRequestPost } from "/home/z/my-project/syda-repo/site/functions/api/telegram.js"
import { onRequest as __api_order_js_onRequest } from "/home/z/my-project/syda-repo/site/functions/api/order.js"
import { onRequest as __api_telegram_js_onRequest } from "/home/z/my-project/syda-repo/site/functions/api/telegram.js"

export const routes = [
    {
      routePath: "/api/support/:route",
      mountPath: "/api/support",
      method: "GET",
      middlewares: [],
      modules: [__api_support__route__js_onRequestGet],
    },
  {
      routePath: "/api/support/:route",
      mountPath: "/api/support",
      method: "POST",
      middlewares: [],
      modules: [__api_support__route__js_onRequestPost],
    },
  {
      routePath: "/api/support/:route",
      mountPath: "/api/support",
      method: "",
      middlewares: [],
      modules: [__api_support__route__js_onRequest],
    },
  {
      routePath: "/api/order",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_order_js_onRequestPost],
    },
  {
      routePath: "/api/telegram",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_telegram_js_onRequestPost],
    },
  {
      routePath: "/api/order",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_order_js_onRequest],
    },
  {
      routePath: "/api/telegram",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_telegram_js_onRequest],
    },
  ]