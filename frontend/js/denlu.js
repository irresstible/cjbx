const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const pwdInput = document.getElementById('pwd');
const rememberMe = document.getElementById('rememberMe');

// 页面加载时读取记住的用户名
window.onload = function () {
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberMe.checked = true;
    }
};

function checkLoginForm() {
    if (!usernameInput.value.trim()) { showToast('用户名不能为空', 'error'); return false; }
    if (!pwdInput.value.trim()) { showToast('密码不能为空', 'error'); return false; }
    if (pwdInput.value.trim().length < 6) { showToast('密码不能少于6位', 'error'); return false; }
    return true;
}

let isLoginSubmitting = false;

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
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            if (rememberMe.checked) {
                localStorage.setItem('savedUsername', usernameInput.value.trim());
            } else {
                localStorage.removeItem('savedUsername');
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

// ====== 显示/隐藏密码 ======
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
