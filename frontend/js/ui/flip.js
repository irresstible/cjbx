/**
 * 全屏翻转背景：点击空白区域暂停 / 继续翻页动画（首页、用户中心共用）
 */
export function bindFlipPause() {
    const inner = document.querySelector('.page-flip__inner');
    const flip = document.querySelector('.page-flip');
    if (!inner || !flip) return;

    flip.addEventListener('click', () => inner.classList.toggle('pause'));
}
