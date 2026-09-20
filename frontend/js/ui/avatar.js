/**
 * 头像上传：点击选择 + 拖拽，本地居中裁剪压缩为 256x256 JPEG
 */
import { showToast } from './toast.js';

const ACCEPTED_TYPES = /^image\/(png|jpe?g|webp)$/;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 256;

/**
 * 读取图片并居中裁剪压缩，返回 data URL
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToSquareDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('图片加载失败，请换一张'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = OUTPUT_SIZE;
                canvas.height = OUTPUT_SIZE;
                const ctx = canvas.getContext('2d');

                // 居中裁剪（cover）
                const scale = Math.max(OUTPUT_SIZE / img.width, OUTPUT_SIZE / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.drawImage(img, (OUTPUT_SIZE - w) / 2, (OUTPUT_SIZE - h) / 2, w, h);

                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 绑定头像上传区
 * @param {object} opts
 * @param {HTMLElement} opts.uploader 可点击 / 拖拽的区域
 * @param {HTMLInputElement} opts.input 隐藏的 file input
 * @param {HTMLElement} [opts.removeBtn] 移除按钮
 * @param {(dataUrl: string) => void} opts.onChange 图片压缩完成回调
 * @param {() => void} [opts.onRemove] 点击移除回调
 */
export function bindAvatarUploader({ uploader, input, removeBtn, onChange, onRemove }) {
    const handleFile = (file) => {
        if (!ACCEPTED_TYPES.test(file.type)) {
            showToast('仅支持 JPG / PNG / WEBP 格式', 'error');
            return;
        }
        if (file.size > MAX_SIZE) {
            showToast('图片大小不能超过 5MB', 'error');
            return;
        }

        fileToSquareDataUrl(file)
            .then(dataUrl => {
                onChange(dataUrl);
                showToast('头像已更新，记得保存', 'success');
            })
            .catch(err => showToast(err.message, 'error'));
    };

    // 点击预览区 / 上传区触发文件选择
    uploader.addEventListener('click', (e) => {
        if (e.target.closest('.avatar-uploader__remove')) return;
        input.click();
    });

    input.addEventListener('change', function () {
        const file = this.files && this.files[0];
        if (file) handleFile(file);
        this.value = ''; // 允许重复选择同一文件
    });

    // 拖拽高亮
    ['dragenter', 'dragover'].forEach(evt =>
        uploader.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploader.classList.add('is-dragover');
        })
    );
    ['dragleave', 'drop'].forEach(evt =>
        uploader.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploader.classList.remove('is-dragover');
        })
    );
    uploader.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    // 阻止浏览器把图片拖到页面其他位置时直接打开
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());

    if (removeBtn && onRemove) {
        removeBtn.addEventListener('click', onRemove);
    }
}
