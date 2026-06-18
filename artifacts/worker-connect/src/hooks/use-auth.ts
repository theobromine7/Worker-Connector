import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();

  const token = localStorage.getItem("workerconnect_token");
  const role = localStorage.getItem("workerconnect_role");
  const workerId = localStorage.getItem("workerconnect_worker_id");

  const isAuthenticated = !!token;
  const isWorker = role === "worker";
  const isAdmin = role === "admin";

  function logout() {
    localStorage.removeItem("workerconnect_token");
    localStorage.removeItem("workerconnect_role");
    localStorage.removeItem("workerconnect_worker_id");
    setLocation("/login");
  }

  function requireWorker() {
    if (!isAuthenticated || !isWorker) {
      setLocation("/login");
      return false;
    }
    return true;
  }

  function requireAdmin() {
    if (!isAuthenticated || !isAdmin) {
      setLocation("/admin/login");
      return false;
    }
    return true;
  }

  return {
    token,
    role,
    workerId: workerId ? parseInt(workerId, 10) : null,
    isAuthenticated,
    isWorker,
    isAdmin,
    logout,
    requireWorker,
    requireAdmin,
  };
}
