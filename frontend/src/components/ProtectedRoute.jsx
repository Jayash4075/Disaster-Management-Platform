import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomeRoute } from "../utils/roleRoutes";

function ProtectedRoute({ children, allowedRoles }) {

    const { user, token } = useAuth();

    if (!token) {
        return (
            <Navigate
                to="/login"
                state={{ message: "Please log in to continue" }}
                replace
            />
        );
    }

    const role = user?.role;

    if (allowedRoles && allowedRoles.length > 0) {

        if (!role || !allowedRoles.includes(role)) {
            return (
                <Navigate
                    to={getHomeRoute(role)}
                    state={{ message: "You don't have permission to access that page." }}
                    replace
                />
            );
        }

    }

    return children;
}

export default ProtectedRoute;