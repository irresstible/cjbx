// ====== 验证码 ======
const getCodeBtn = document.getElementById('getCodeBtn');

getCodeBtn.addEventListener('click', function () {
    const phoneVal = document.getElementById('phone').value.trim();
    if (!PHONE_REGEX.test(phoneVal)) {
        showToast('请输入正确的11位手机号', 'error');
        return;
    }

    apiPost('/api/sendCode', { phone: phoneVal })
    .then(data => {
        if (data.code === 200) {
            showToast('验证码已发送！请到后端终端查看', 'success');
            startCountdown(getCodeBtn);
        } else {
            showToast(data.msg, 'error');
        }
    })
    .catch(() => showToast('网络错误，后端没启动', 'error'));
});

// ====== 表单校验 ======
function checkResetForm() {
    const phone = document.getElementById('phone').value.trim();
    const verifyCode = document.getElementById('verifyCode').value.trim();
    const newPwd = document.getElementById('newPwd').value.trim();
    const newPwd2 = document.getElementById('newPwd2').value.trim();

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

// ====== 重置密码提交 ======
const resetBtn = document.getElementById('resetBtn');
let isResetSubmitting = false;

resetBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (isResetSubmitting) return;
    if (!checkResetForm()) return;

    isResetSubmitting = true;
    setBtnLoading(resetBtn, '提交中...');

    apiPost('/api/resetPassword', {
        phone: document.getElementById('phone').value.trim(),
        verifyCode: document.getElementById('verifyCode').value.trim(),
        newPassword: document.getElementById('newPwd').value.trim()
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
