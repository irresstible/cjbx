/**
 * 本地存储：登录态与用户名的唯一读写入口
 */

const TOKEN_KEY = 'token';
const USERNAME_KEY = 'username';
const SAVED_USERNAME_KEY = 'savedUsername';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const getUsername = () => localStorage.getItem(USERNAME_KEY);

export const setUsername = (username) => localStorage.setItem(USERNAME_KEY, username);

export const getSavedUsername = () => localStorage.getItem(SAVED_USERNAME_KEY);

export const setSavedUsername = (username) =>
    localStorage.setItem(SAVED_USERNAME_KEY, username);

export const removeSavedUsername = () =>
    localStorage.removeItem(SAVED_USERNAME_KEY);

/**
 * 退出登录：清除全部登录相关数据
 */
export const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(SAVED_USERNAME_KEY);
};
