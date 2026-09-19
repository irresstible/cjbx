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
function checkForm() {
    const username = document.getElementById('username').value.trim();
    const pwd = document.getElementById('pwd').value.trim();
    const pwd2 = document.getElementById('pwd2').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const verifyCode = document.getElementById('verifyCode').value.trim();

    if (username.length < 2 || username.length > 16) {
        showToast('用户名必须是2-16位字符', 'error'); return false;
    }
    if (pwd.length < 6) {
        showToast('密码长度不能少于6位', 'error'); return false;
    }
    if (pwd !== pwd2) {
        showToast('两次输入的密码不一致', 'error'); return false;
    }
    if (!PHONE_REGEX.test(phone)) {
        showToast('手机号格式不正确', 'error'); return false;
    }
    if (!verifyCode) {
        showToast('请输入验证码', 'error'); return false;
    }
    return true;
}

// ====== 注册提交 ======
const registerBtn = document.getElementById('registerBtn');
let isSubmitting = false;

registerBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!checkForm()) return;

    isSubmitting = true;
    setBtnLoading(registerBtn, '提交中...');

    apiPost('/api/register', {
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('pwd').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        verifyCode: document.getElementById('verifyCode').value.trim()
    })
    .then(data => {
        if (data.code === 200) {
            showToast('注册成功！跳转到登录页', 'success');
            setTimeout(() => { location.href = 'denlu.html'; }, 800);
        } else {
            showToast(data.msg, 'error');
            isSubmitting = false;
            resetBtnState(registerBtn, '注册账号');
        }
    })
    .catch(() => {
        showToast('网络错误', 'error');
        isSubmitting = false;
        resetBtnState(registerBtn, '注册账号');
    });
});
