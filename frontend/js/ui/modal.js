/**
 * 通用模态弹窗：打开 / 关闭过渡 + Promise 风格确认框
 */

/** 打开弹窗（带过渡动画） */
export function openModal(modalEl) {
    modalEl.hidden = false;
    requestAnimationFrame(() => modalEl.classList.add('show'));
}

/** 关闭弹窗（等过渡结束再隐藏） */
export function closeModal(modalEl) {
    modalEl.classList.remove('show');
    setTimeout(() => { modalEl.hidden = true; }, 250);
}

/**
 * 现代确认框（依赖页面中的 #confirmModal 结构），返回 Promise<boolean>
 * @param {string} message 提示内容
 * @param {string} [title='提示'] 标题
 */
export function showConfirm(message, title = '提示') {
    return new Promise(resolve => {
        const modalEl = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMsg').textContent = message;

        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        const cleanup = (result) => {
            closeModal(modalEl);
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            modalEl.onclick = null;
            resolve(result);
        };

        okBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        // 点击遮罩 = 取消
        modalEl.onclick = (e) => { if (e.target === modalEl) cleanup(false); };

        openModal(modalEl);
        okBtn.focus();
    });
}
