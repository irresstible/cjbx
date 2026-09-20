/**
 * 网络请求封装：统一拼接地址、注入鉴权 Token
 */
import { API_BASE } from './config.js';
import { getToken } from './storage.js';

function request(url, options = {}) {
    const headers = options.headers || {};
    if (options.auth) headers['Authorization'] = 'Bearer ' + getToken();
    return fetch(API_BASE + url, { ...options, headers }).then(res => res.json());
}

export const apiGet = (url) =>
    request(url, { auth: true });

export const apiPost = (url, body) =>
    request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

export const apiPut = (url, body) =>
    request(url, {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
