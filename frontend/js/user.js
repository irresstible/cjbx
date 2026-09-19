// ====== 用户中心页面逻辑 ======

// ====== 登录检查 + 加载用户数据 ======
window.onload = function () {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录', 'error');
        setTimeout(() => { location.href = 'denlu.html'; }, 800);
        return;
    }

    apiGet('/api/profile')
    .then(data => {
        if (data.code === 200) {
            renderUserInfo(data.data);
        } else {
            showToast('登录已过期，请重新登录', 'error');
            localStorage.clear();
            setTimeout(() => { location.href = 'denlu.html'; }, 800);
        }
    })
    .catch(() => {
        showToast('网络错误', 'error');
    });
};

/**
 * 渲染用户信息到页面
 */
function renderUserInfo(user) {
    // 用户名
    document.getElementById('username').textContent = user.username;

    // 头像：显示用户名首字母
    const avatarEl = document.getElementById('avatar');
    avatarEl.textContent = user.username.charAt(0).toUpperCase();

    // 手机号脱敏
    const phone = user.phone;
    document.getElementById('phone').textContent =
        phone.substring(0, 3) + '****' + phone.substring(7);

    // 注册时间
    document.getElementById('createdAt').textContent = user.createdAt;
}

// ====== 标签页切换 ======
const tabLinks = document.querySelectorAll('.tab-link');
const tabPanels = document.querySelectorAll('.tab-panel');

tabLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetTab = this.dataset.tab;

        // 切换导航高亮
        tabLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // 切换面板（带动画）
        tabPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === 'panel-' + targetTab) {
                panel.classList.add('active');
            }
        });
    });
});

// ====== 点击翻转背景暂停/继续（与首页一致） ======
const pageFlipInner = document.querySelector('.page-flip__inner');
const pageFlip = document.querySelector('.page-flip');

pageFlip.addEventListener('click', function () {
    pageFlipInner.classList.toggle('pause');
});

// ====== 事件委托：data-toast 元素点击提示 ======
document.addEventListener('click', function (e) {
    const target = e.target.closest('[data-toast]');
    if (target) {
        showToast(target.dataset.toast, 'info');
    }
});

// ====== 退出登录 ======
document.getElementById('logoutLink').addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('savedUsername');
        showToast('已退出登录', 'success');
        setTimeout(() => {
            location.href = 'denlu.html';
        }, 1000);
    }
});
