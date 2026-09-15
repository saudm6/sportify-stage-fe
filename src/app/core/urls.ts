export const PAGE_PATHS = {
  login: 'login',
  account: 'account',
  products: 'product',
  addProduct: 'product/add',
  orders: 'order',
  orderLineItems: 'order-line-item',
  users: 'users',
  register: 'register',
  staff: 'staff',
  dashboard: 'dashboard',
};
export const LOGIN_URL = `/${PAGE_PATHS.login}`;

export const API_BASE_URL = 'http://localhost:5210/api';
export const AUTH_API_URLS = {
  login: `${API_BASE_URL}/account/login`,
  register: `${API_BASE_URL}/account/register`,
  registrationOptions: `${API_BASE_URL}/account/registration-options`,
};
