/**
 * 登录页入口
 */
import { apiPost } from '../api.js';
import {
    setToken, setUsername,
    getSavedUsername, setSavedUsername, removeSavedUsername
} from '../storage.js';
import { showToast } from '../ui/toast.js';
import { setBtnLoading, resetBtnState } from '../ui/button.js';

const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const pwdInput = document.getElementById('pwd');
const rememberMe = document.getElementById('rememberMe');

// 回填记住的用户名
const savedUsername = getSavedUsername();
if (savedUsername) {
    usernameInput.value = savedUsername;
    rememberMe.checked = true;
}

function checkLoginForm() {
    if (!usernameInput.value.trim()) { showToast('用户名不能为空', 'error'); return false; }
    if (!pwdInput.value.trim()) { showToast('密码不能为空', 'error'); return false; }
    if (pwdInput.value.trim().length < 6) { showToast('密码不能少于6位', 'error'); return false; }
    return true;
}

let isLoginSubmitting = false;

// 回车提交表单（避免触发浏览器默认刷新）
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    loginBtn.click();
});

loginBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (isLoginSubmitting) return;
    if (!checkLoginForm()) return;

    isLoginSubmitting = true;
    setBtnLoading(loginBtn, '登录中...');

    apiPost('/api/login', {
        username: usernameInput.value.trim(),
        password: pwdInput.value.trim()
    })
    .then(data => {
        if (data.code === 200) {
            setToken(data.token);
            setUsername(data.username);
            if (rememberMe.checked) {
                setSavedUsername(usernameInput.value.trim());
            } else {
                removeSavedUsername();
            }
            showToast('登录成功！', 'success');
            setTimeout(() => { location.href = 'user.html'; }, 800);
        } else {
            showToast(data.msg, 'error');
            isLoginSubmitting = false;
            resetBtnState(loginBtn, '登录');
        }
    })
    .catch(() => {
        showToast('网络错误', 'error');
        isLoginSubmitting = false;
        resetBtnState(loginBtn, '登录');
    });
});

// ====== 显示 / 隐藏密码 ======
const togglePwd = document.getElementById('togglePwd');
const eyeOpen = document.getElementById('eyeOpen');
const eyeClose = document.getElementById('eyeClose');

togglePwd.addEventListener('click', function () {
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClose.style.display = 'block';
    } else {
        pwdInput.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClose.style.display = 'none';
    }
});
