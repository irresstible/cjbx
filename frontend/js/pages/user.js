/**
 * 用户中心入口：资料展示、标签切换、编辑资料（含头像上传）、退出登录
 */
import { apiGet, apiPut } from '../api.js';
import { clearAuth } from '../storage.js';
import { showToast } from '../ui/toast.js';
import { setBtnLoading, resetBtnState } from '../ui/button.js';
import { openModal, closeModal, showConfirm } from '../ui/modal.js';
import { bindFlipPause } from '../ui/flip.js';
import { bindAvatarUploader } from '../ui/avatar.js';

const GENDER_TEXT = { male: '男', female: '女', secret: '保密' };
const DEFAULT_BIO = '热爱新年文化，喜欢分享节日祝福和年俗故事。';

// 当前登录用户资料（编辑弹窗的数据源）
let currentUser = null;
// 编辑弹窗内待保存的头像（null 未更改，'' 移除，字符串为新 data URL）
let pendingAvatar = null;
let isSaving = false;

// ====== 登录检查 + 加载用户数据 ======
window.addEventListener('load', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('请先登录', 'error');
        setTimeout(() => { location.href = 'denlu.html'; }, 800);
        return;
    }

    apiGet('/api/profile')
        .then(data => {
            if (data.code === 200) {
                currentUser = data.data;
                renderUserInfo(currentUser);
            } else {
                showToast('登录已过期，请重新登录', 'error');
                localStorage.clear();
                setTimeout(() => { location.href = 'denlu.html'; }, 800);
            }
        })
        .catch(() => showToast('网络错误', 'error'));
});

/** 渲染用户信息到页面 */
function renderUserInfo(user) {
    // 展示名：优先昵称，其次登录账号
    const displayName = user.nickname || user.username;
    document.getElementById('username').textContent = displayName;
    document.getElementById('accountName').textContent = user.username;

    // 头像：有图片显示图片，否则显示用户名首字母
    const avatarImg = document.getElementById('avatarImg');
    const avatarLetter = document.getElementById('avatarLetter');
    if (user.avatar) {
        avatarImg.src = user.avatar;
        avatarImg.hidden = false;
        avatarLetter.hidden = true;
    } else {
        avatarImg.hidden = true;
        avatarImg.removeAttribute('src');
        avatarLetter.hidden = false;
        avatarLetter.textContent = (user.nickname || user.username).charAt(0).toUpperCase();
    }

    // 手机号脱敏
    document.getElementById('phone').textContent =
        user.phone.substring(0, 3) + '****' + user.phone.substring(7);

    // 性别 / 注册时间 / 简介
    document.getElementById('gender').textContent = GENDER_TEXT[user.gender] || '保密';
    document.getElementById('createdAt').textContent = user.createdAt;
    document.getElementById('bio').textContent = user.bio || DEFAULT_BIO;
}

// ====== 标签页切换 ======
const tabLinks = document.querySelectorAll('.tab-link');
const tabPanels = document.querySelectorAll('.tab-panel');

tabLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetTab = this.dataset.tab;

        tabLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === 'panel-' + targetTab);
        });
    });
});

// ====== 点击翻转背景暂停 / 继续 ======
bindFlipPause();

// ====== 编辑资料弹窗 ======
const editModal = document.getElementById('editModal');
const editNickname = document.getElementById('editNickname');
const editBio = document.getElementById('editBio');
const bioCount = document.getElementById('bioCount');
const avatarInput = document.getElementById('avatarInput');
const avatarUploader = document.getElementById('avatarUploader');
const avatarRemoveBtn = document.getElementById('avatarRemoveBtn');

/** 更新弹窗内头像预览（有图显图，无图显首字母） */
function updateAvatarPreview(avatar, name) {
    const previewImg = document.getElementById('previewImg');
    const previewLetter = document.getElementById('previewLetter');
    if (avatar) {
        previewImg.src = avatar;
        previewImg.hidden = false;
        previewLetter.hidden = true;
    } else {
        previewImg.hidden = true;
        previewImg.removeAttribute('src');
        previewLetter.hidden = false;
        previewLetter.textContent = (name || 'U').charAt(0).toUpperCase();
    }
}

/** 用 currentUser 初始化弹窗表单 */
function openEditModal() {
    if (!currentUser) {
        showToast('资料加载中，请稍后再试', 'info');
        return;
    }

    pendingAvatar = null; // 未更改
    editNickname.value = currentUser.nickname || '';
    editBio.value = currentUser.bio || '';
    bioCount.textContent = editBio.value.length;

    const gender = currentUser.gender || 'secret';
    document.querySelectorAll('input[name="gender"]').forEach(radio => {
        radio.checked = radio.value === gender;
    });

    updateAvatarPreview(currentUser.avatar, currentUser.nickname || currentUser.username);
    avatarRemoveBtn.hidden = !currentUser.avatar;

    openModal(editModal);
}

// 打开弹窗：编辑按钮 / 头像角标
document.getElementById('editProfileBtn').addEventListener('click', openEditModal);
document.getElementById('avatarEditBtn').addEventListener('click', openEditModal);

// 关闭弹窗
document.getElementById('editCloseBtn').addEventListener('click', () => closeModal(editModal));
document.getElementById('editCancelBtn').addEventListener('click', () => closeModal(editModal));
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal(editModal);
});

// ESC 关闭最上层弹窗
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!editModal.hidden) closeModal(editModal);
});

// 字数统计
editBio.addEventListener('input', () => {
    bioCount.textContent = editBio.value.length;
});

// ====== 头像上传（点击 + 拖拽 + 本地压缩） ======
bindAvatarUploader({
    uploader: avatarUploader,
    input: avatarInput,
    removeBtn: avatarRemoveBtn,
    onChange(dataUrl) {
        pendingAvatar = dataUrl;
        updateAvatarPreview(dataUrl, editNickname.value || currentUser.username);
        avatarRemoveBtn.hidden = false;
    },
    onRemove() {
        pendingAvatar = '';
        updateAvatarPreview(null, editNickname.value || (currentUser && currentUser.username));
        avatarRemoveBtn.hidden = true;
    }
});

// ====== 保存资料 ======
document.getElementById('saveProfileBtn').addEventListener('click', function () {
    if (isSaving || !currentUser) return;

    const payload = {
        nickname: editNickname.value.trim(),
        gender: document.querySelector('input[name="gender"]:checked')?.value || 'secret',
        bio: editBio.value.trim()
    };

    if (payload.nickname.length > 16) {
        showToast('昵称不能超过16个字符', 'error');
        return;
    }
    if (payload.bio.length > 100) {
        showToast('个人简介不能超过100个字符', 'error');
        return;
    }
    // 只有真正改过头像才提交 avatar 字段
    if (pendingAvatar !== null) payload.avatar = pendingAvatar;

    isSaving = true;
    setBtnLoading(this, '保存中...');

    apiPut('/api/profile', payload)
        .then(data => {
            if (data.code === 200) {
                currentUser = data.data;
                renderUserInfo(currentUser);
                closeModal(editModal);
                showToast('资料保存成功', 'success');
            } else if (data.code === 401) {
                showToast('登录已过期，请重新登录', 'error');
                localStorage.clear();
                setTimeout(() => { location.href = 'denlu.html'; }, 800);
            } else {
                showToast(data.msg || '保存失败', 'error');
            }
        })
        .catch(() => showToast('网络错误', 'error'))
        .finally(() => {
            isSaving = false;
            resetBtnState(this, '保存修改');
        });
});

// ====== 退出登录 ======
document.getElementById('logoutLink').addEventListener('click', async function (e) {
    e.preventDefault();
    const ok = await showConfirm('确定要退出登录吗？', '退出登录');
    if (!ok) return;

    clearAuth();
    showToast('已退出登录', 'success');
    setTimeout(() => {
        location.href = 'denlu.html';
    }, 800);
});
