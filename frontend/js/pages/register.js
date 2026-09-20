/**
 * 注册页入口
 */
import { apiPost } from '../api.js';
import { PHONE_REGEX } from '../config.js';
import { showToast } from '../ui/toast.js';
import { setBtnLoading, resetBtnState } from '../ui/button.js';
import { setupPasswordToggle, bindVerifyCodeButton } from '../ui/form.js';

const usernameInput = document.getElementById('username');
const pwdInput = document.getElementById('pwd');
const pwd2Input = document.getElementById('pwd2');
const phoneInput = document.getElementById('phone');
const verifyCodeInput = document.getElementById('verifyCode');
const getCodeBtn = document.getElementById('getCodeBtn');
const registerBtn = document.getElementById('registerBtn');

// 密码小眼睛 + 发送验证码
setupPasswordToggle(pwdInput);
setupPasswordToggle(pwd2Input);
bindVerifyCodeButton(getCodeBtn, () => phoneInput.value.trim());

// 回车提交表单
document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    registerBtn.click();
});

function checkForm() {
    const username = usernameInput.value.trim();
    const pwd = pwdInput.value.trim();
    const pwd2 = pwd2Input.value.trim();
    const phone = phoneInput.value.trim();
    const verifyCode = verifyCodeInput.value.trim();

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

let isSubmitting = false;

registerBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!checkForm()) return;

    isSubmitting = true;
    setBtnLoading(registerBtn, '提交中...');

    apiPost('/api/register', {
        username: usernameInput.value.trim(),
        password: pwdInput.value.trim(),
        phone: phoneInput.value.trim(),
        verifyCode: verifyCodeInput.value.trim()
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
