import { onRequestPost as __api_order_js_onRequestPost } from "/home/z/my-project/syda-site/functions/api/order.js"
import { onRequest as __api_order_js_onRequest } from "/home/z/my-project/syda-site/functions/api/order.js"

export const routes = [
    {
      routePath: "/api/order",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_order_js_onRequestPost],
    },
  {
      routePath: "/api/order",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_order_js_onRequest],
    },
  ]