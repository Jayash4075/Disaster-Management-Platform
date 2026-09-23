export function getHomeRoute(role) {
    if (role === "authority") {
        return "/authority";
    }

    // citizen, rescuer, ngo, volunteer all share the citizen dashboard
    return "/dashboard";
}