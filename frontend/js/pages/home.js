/**
 * 首页入口：图片灯箱、翻转暂停、登录态导航
 */
import { apiGet } from '../api.js';
import { clearAuth, getUsername } from '../storage.js';
import { showToast } from '../ui/toast.js';
import { bindFlipPause } from '../ui/flip.js';

// ====== 图片灯箱 ======
const imgModal = document.getElementById('img-modal');
const imgModalPic = document.getElementById('img-modal__pic');

function openImgModal(src) {
    imgModalPic.src = src;
    imgModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeImgModal() {
    imgModal.classList.remove('show');
    document.body.style.overflow = '';
}

// 点击带 data-img 的链接打开（事件委托）
document.addEventListener('click', function (e) {
    const link = e.target.closest('[data-img]');
    if (link) {
        e.preventDefault();
        openImgModal(link.dataset.img);
    }
});

document.getElementById('imgModalClose').addEventListener('click', closeImgModal);

// 点击遮罩关闭
imgModal.addEventListener('click', function (e) {
    if (e.target === imgModal) closeImgModal();
});

// ESC 关闭
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && imgModal.classList.contains('show')) {
        closeImgModal();
    }
});

// ====== 点击翻转区域暂停 / 继续 ======
bindFlipPause();

// ====== 登录态导航 ======
const navAvatar = document.getElementById('navAvatar');
const navUsername = document.getElementById('navUsername');
const authLink = document.getElementById('authLink');

/** 无自定义头像时的首字母兜底 */
function letterAvatar(name) {
    const letter = (name || 'U').charAt(0).toUpperCase();
    return 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52">' +
        '<rect width="52" height="52" rx="26" fill="#c45620"/>' +
        '<text x="26" y="35" text-anchor="middle" fill="#fff" font-size="24" font-weight="bold">' +
        letter + '</text></svg>'
    );
}

function renderLoggedIn(user) {
    navUsername.textContent = user.nickname || user.username;
    navAvatar.src = user.avatar || letterAvatar(user.nickname || user.username);
    authLink.textContent = '退出登录';
    authLink.href = '#';
}

function renderLoggedOut() {
    navUsername.textContent = '我的主页';
    navAvatar.src = 'img/favicon.ico';
    authLink.textContent = '登录|注册';
    authLink.href = 'denlu.html';
}

authLink.addEventListener('click', function (e) {
    if (authLink.textContent === '退出登录') {
        e.preventDefault();
        clearAuth();
        showToast('已退出登录', 'success');
        renderLoggedOut();
    }
});

window.addEventListener('load', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        renderLoggedOut();
        return;
    }

    apiGet('/api/profile')
        .then(data => {
            if (data.code === 200) {
                renderLoggedIn(data.data);
            } else {
                // token 失效：清理本地态
                localStorage.clear();
                renderLoggedOut();
            }
        })
        .catch(() => {
            // 后端不可用时回退到本地缓存用户名
            const cached = getUsername();
            if (cached) {
                navUsername.textContent = cached;
                navAvatar.src = letterAvatar(cached);
                authLink.textContent = '退出登录';
                authLink.href = '#';
            } else {
                renderLoggedOut();
            }
        });
});
