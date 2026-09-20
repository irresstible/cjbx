/**
 * 按钮提交状态
 */

export function setBtnLoading(btn, text) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
    btn.innerText = text;
}

export function resetBtnState(btn, text) {
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.innerText = text;
}
