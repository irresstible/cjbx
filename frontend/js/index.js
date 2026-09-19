// ====== 首页逻辑 ======

const imgModal = document.getElementById('img-modal');
const imgModalPic = document.getElementById('img-modal__pic');

// ====== 图片弹窗：点击带 data-img 的链接打开 ======
document.addEventListener('click', function (e) {
    const link = e.target.closest('[data-img]');
    if (link) {
        e.preventDefault();
        imgModalPic.src = link.dataset.img;
        imgModal.style.display = 'block';
    }
});

// 关闭弹窗
document.getElementById('imgModalClose').addEventListener('click', function () {
    imgModal.style.display = 'none';
});

// 点击弹窗背景也关闭
imgModal.addEventListener('click', function (e) {
    if (e.target === imgModal) {
        imgModal.style.display = 'none';
    }
});

// ====== 点击翻转区域暂停/继续 ======
const pageFlipInner = document.querySelector('.page-flip__inner');
const pageFlip = document.querySelector('.page-flip');

pageFlip.addEventListener('click', function () {
    pageFlipInner.classList.toggle('pause');
});

// ====== 页面加载时检查登录状态，显示真实用户名 ======
window.onload = function () {
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('navUsername').textContent = username;
        document.getElementById('navAvatar').src = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#03e9f4"/><text x="12" y="17" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">' + username.charAt(0).toUpperCase() + '</text></svg>'
        );
    }
};
