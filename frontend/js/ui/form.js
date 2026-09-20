/**
 * 表单通用交互：密码可见切换、验证码倒计时与发送
 */
import { PHONE_REGEX } from '../config.js';
import { apiPost } from '../api.js';
import { showToast } from './toast.js';

const PWD_EYE_OPEN =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
const PWD_EYE_CLOSE =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';

/**
 * 为密码输入框注入“小眼睛”切换按钮
 * @param {HTMLInputElement} input type=password 的输入框
 */
export function setupPasswordToggle(input) {
    if (!input) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle-pwd';
    btn.setAttribute('aria-label', '显示密码');
    btn.innerHTML = PWD_EYE_OPEN;
    input.insertAdjacentElement('afterend', btn);

    btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = show ? PWD_EYE_CLOSE : PWD_EYE_OPEN;
        btn.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
        input.focus();
    });
}

/**
 * 启动发送验证码倒计时
 * @param {HTMLElement} btn 按钮元素
 * @param {number} [seconds=60] 倒计时秒数
 */
export function startCountdown(btn, seconds = 60) {
    let count = seconds;
    btn.style.color = '#888';
    btn.style.pointerEvents = 'none';
    const timer = setInterval(() => {
        count--;
        btn.innerText = `${count}s后重发`;
        if (count <= 0) {
            clearInterval(timer);
            btn.innerText = '获取验证码';
            // 交还 CSS 控制，避免内联灰色残留
            btn.style.color = '';
            btn.style.pointerEvents = '';
        }
    }, 1000);
}

/**
 * 绑定“获取验证码”按钮（注册 / 重置页共用）
 * @param {HTMLElement} btn 按钮
 * @param {() => string} getPhone 返回当前手机号输入值
 */
export function bindVerifyCodeButton(btn, getPhone) {
    btn.addEventListener('click', () => {
        const phone = getPhone();
        if (!PHONE_REGEX.test(phone)) {
            showToast('请输入正确的11位手机号', 'error');
            return;
        }

        apiPost('/api/sendCode', { phone })
            .then(data => {
                if (data.code === 200) {
                    showToast('验证码已发送！请到后端终端查看', 'success');
                    startCountdown(btn);
                } else {
                    showToast(data.msg, 'error');
                }
            })
            .catch(() => showToast('网络错误，后端没启动', 'error'));
    });
}
