export default defineNuxtRouteMiddleware((to) => {
  const session = useCookie("bs_session");
  const authed = Boolean(session.value);

  if (to.path === "/login") {
    if (authed) return navigateTo("/");
    return;
  }

  if (!authed) {
    return navigateTo({ path: "/login", query: to.path === "/" ? {} : { redirect: to.path } });
  }
});
