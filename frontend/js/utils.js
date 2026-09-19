// ====== 公共工具模块 ======

// API 基础地址：自动适配当前域名，开发时或本地文件打开时回退 localhost
const API_BASE = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : '';

// ====== 手机号正则（前后端统一） ======
const PHONE_REGEX = /^1[3-9]\d{9}$/;

// ====== 网络请求 ======

/**
 * POST 请求封装
 */
function apiPost(url, body) {
    return fetch(API_BASE + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(res => res.json());
}

/**
 * GET 请求封装（自动带 Token）
 */
function apiGet(url) {
    const token = localStorage.getItem('token') || '';
    return fetch(API_BASE + url, {
        headers: { 'Authorization': 'Bearer ' + token }
    }).then(res => res.json());
}

// ====== 按钮状态管理 ======

function setBtnLoading(btn, text) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
    btn.innerText = text;
}

function resetBtnState(btn, text) {
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.innerText = text;
}

// ====== 验证码倒计时 ======

/**
 * 启动倒计时
 * @param {HTMLElement} btn - 按钮元素
 * @param {number} seconds - 倒计时秒数，默认 60
 */
function startCountdown(btn, seconds = 60) {
    let count = seconds;
    btn.style.color = '#888';
    btn.style.pointerEvents = 'none';
    const timer = setInterval(() => {
        count--;
        btn.innerText = `${count}s后重发`;
        if (count <= 0) {
            clearInterval(timer);
            btn.innerText = '获取验证码';
            btn.style.color = '#b0b0b0';
            btn.style.pointerEvents = 'auto';
        }
    }, 1000);
}

// ====== Toast 统一提示 ======

let _toastEl = null;
let _toastTimer = null;

/**
 * 显示 Toast 提示（自动创建 DOM）
 * @param {string} msg - 提示内容
 * @param {string} type - 类型：'success' | 'error' | 'info'，默认 'info'
 * @param {number} duration - 显示时长（毫秒），默认 2000
 */
function showToast(msg, type = 'info', duration = 2000) {
    if (!_toastEl) {
        _toastEl = document.createElement('div');
        _toastEl.className = 'global-toast';
        document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = msg;
    _toastEl.className = 'global-toast global-toast--' + type;

    // 触发重绘以启动动画
    requestAnimationFrame(() => {
        _toastEl.classList.add('show');
    });

    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
        _toastEl.classList.remove('show');
    }, duration);
}
