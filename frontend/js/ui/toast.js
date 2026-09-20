/**
 * Toast 统一提示（单例，自动创建 DOM）
 */

let toastEl = null;
let toastTimer = null;

/**
 * 显示 Toast
 * @param {string} msg 提示内容
 * @param {'info'|'success'|'error'} [type] 类型
 * @param {number} [duration=2000] 显示时长（毫秒）
 */
export function showToast(msg, type = 'info', duration = 2000) {
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'global-toast';
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = 'global-toast global-toast--' + type;

    // 触发重绘以启动动画
    requestAnimationFrame(() => toastEl.classList.add('show'));

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}
