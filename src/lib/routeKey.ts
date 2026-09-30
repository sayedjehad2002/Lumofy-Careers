/**
 * What App's page transition is keyed on.
 *
 * Every dashboard URL (/dashboard/jobs, /dashboard/applicants/<id>, …) shares one
 * key, so moving between tabs does not remount <Dashboard>. It used to be keyed on
 * the full pathname, which threw away the dashboard's own state on every tab
 * switch: clicking a role on Jobs set the job filter, the remount reset it, and
 * Applicants opened on "All jobs". The dashboard animates its own tabs; public
 * pages still get a full transition per URL.
 */
export const routeKey = (pathname: string) =>
  pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? "/dashboard" : pathname;
