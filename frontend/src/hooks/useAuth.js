// Sin autenticación — acceso directo siempre
export const useAuth = () => ({
  isAuthenticated: true,
  login: () => {},
  logout: () => {},
});
