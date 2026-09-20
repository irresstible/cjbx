/**
 * 忘记密码 / 重置密码页入口
 */
import { apiPost } from '../api.js';
import { PHONE_REGEX } from '../config.js';
import { showToast } from '../ui/toast.js';
import { setBtnLoading, resetBtnState } from '../ui/button.js';
import { setupPasswordToggle, bindVerifyCodeButton } from '../ui/form.js';

const phoneInput = document.getElementById('phone');
const verifyCodeInput = document.getElementById('verifyCode');
const newPwdInput = document.getElementById('newPwd');
const newPwd2Input = document.getElementById('newPwd2');
const getCodeBtn = document.getElementById('getCodeBtn');
const resetBtn = document.getElementById('resetBtn');

// 密码小眼睛 + 发送验证码
setupPasswordToggle(newPwdInput);
setupPasswordToggle(newPwd2Input);
bindVerifyCodeButton(getCodeBtn, () => phoneInput.value.trim());

// 回车提交表单
document.getElementById('resetForm').addEventListener('submit', function (e) {
    e.preventDefault();
    resetBtn.click();
});

function checkResetForm() {
    const phone = phoneInput.value.trim();
    const verifyCode = verifyCodeInput.value.trim();
    const newPwd = newPwdInput.value.trim();
    const newPwd2 = newPwd2Input.value.trim();

    if (!PHONE_REGEX.test(phone)) {
        showToast('手机号格式不正确', 'error'); return false;
    }
    if (!verifyCode) {
        showToast('请输入验证码', 'error'); return false;
    }
    if (newPwd.length < 6) {
        showToast('新密码长度不能少于6位', 'error'); return false;
    }
    if (newPwd !== newPwd2) {
        showToast('两次输入的密码不一致', 'error'); return false;
    }
    return true;
}

let isResetSubmitting = false;

resetBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (isResetSubmitting) return;
    if (!checkResetForm()) return;

    isResetSubmitting = true;
    setBtnLoading(resetBtn, '提交中...');

    apiPost('/api/resetPassword', {
        phone: phoneInput.value.trim(),
        verifyCode: verifyCodeInput.value.trim(),
        newPassword: newPwdInput.value.trim()
    })
    .then(data => {
        if (data.code === 200) {
            showToast('密码重置成功！', 'success');
            setTimeout(() => { location.href = 'denlu.html'; }, 800);
        } else {
            showToast(data.msg, 'error');
            resetBtnState(resetBtn, '重置密码');
        }
    })
    .catch(() => {
        showToast('网络错误', 'error');
        resetBtnState(resetBtn, '重置密码');
    });
});
