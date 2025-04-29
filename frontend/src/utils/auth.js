import Cookies from 'js-cookie';

export const setAuthCookies = (token, role, rememberMe = false) => {
  Cookies.set('auth-token', token, {
    expires: rememberMe ? 30 : undefined, // 30 days if remember me is checked
    path: '/',
  });
  
  Cookies.set('user-role', role, {
    expires: rememberMe ? 30 : undefined,
    path: '/',
  });
};

export const removeAuthCookies = () => {
  Cookies.remove('auth-token', { path: '/' });
  Cookies.remove('user-role', { path: '/' });
};

export const getAuthToken = () => {
  return Cookies.get('auth-token');
};

export const getUserRole = () => {
  return Cookies.get('user-role');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
}; 