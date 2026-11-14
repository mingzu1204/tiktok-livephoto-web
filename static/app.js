let currentData = null;
let currentIndex = 0;
let selectedIndices = new Set();
let currentPlatform = 'android';

const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const submitBtn = document.getElementById('submitBtn');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');
const stickyActionDock = document.getElementById('stickyActionDock');
const toastEl = document.getElementById('toast');

const authorAvatar = document.getElementById('authorAvatar');
const authorNickname = document.getElementById('authorNickname');
const authorHandle = document.getElementById('authorHandle');
const filterNotice = document.getElementById('filterNotice');

const showcaseFrame = document.getElementById('showcaseFrame');
const showcaseImage = document.getElementById('showcaseImage');
const showcaseVideo = document.getElementById('showcaseVideo');
const hudCounter = document.getElementById('hudCounter');
const hudCheckBtn = document.getElementById('hudCheckBtn');
const livePlayHint = document.getElementById('livePlayHint');
const prevSlideBtn = document.getElementById('prevSlideBtn');
const nextSlideBtn = document.getElementById('nextSlideBtn');
const thumbnailStrip = document.getElementById('thumbnailStrip');

const downloadCurrentBtn = document.getElementById('downloadCurrentBtn');
const quickDownloadText = document.getElementById('quickDownloadText');
const selectAllToggleBtn = document.getElementById('selectAllToggleBtn');
const dockSelectedCount = document.getElementById('dockSelectedCount');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const mainDownloadBtnText = document.getElementById('mainDownloadBtnText');

const desktopSelectedCount = document.getElementById('desktopSelectedCount');
const desktopSelectAllBtn = document.getElementById('desktopSelectAllBtn');
const desktopSelectAllText = document.getElementById('desktopSelectAllText');
const desktopDownloadSelectedBtn = document.getElementById('desktopDownloadSelectedBtn');
const desktopDownloadSelectedText = document.getElementById('desktopDownloadSelectedText');
const desktopDownloadZipBtn = document.getElementById('desktopDownloadZipBtn');

const helpModalBtn = document.getElementById('helpModalBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
const tabContentIos = document.getElementById('tabContentIos');
const tabContentAndroid = document.getElementById('tabContentAndroid');

function showToast(message, duration = 2500) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, duration);
}

pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            urlInput.value = text;
            showToast('Đã dán liên kết!');
            sendTelemetryPing('paste', text.trim());
            handleParse();
        }
    } catch (e) {
        showToast('Hãy dán link vào ô tìm kiếm!');
    }
});

urlInput.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text');
    if (text) {
        sendTelemetryPing('paste', text.trim());
    }
});

urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleParse();
    }
});

submitBtn.addEventListener('click', handleParse);

function detectUserPlatform() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIOS ? 'ios' : 'android';
}

function setPlatform(platform) {
    currentPlatform = platform;
    document.querySelectorAll('.segment-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.platform === platform);
    });
    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === platform);
    });
    if (tabContentIos && tabContentAndroid) {
        if (platform === 'ios') {
            tabContentIos.style.display = 'flex';
            tabContentAndroid.style.display = 'none';
        } else {
            tabContentIos.style.display = 'none';
            tabContentAndroid.style.display = 'flex';
        }
    }
    updatePlatformLabels();
}

document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setPlatform(btn.dataset.platform);
        showToast(`Chế độ: ${currentPlatform === 'ios' ? 'Apple (iOS)' : 'Android'}`);
    });
});

function updatePlatformLabels() {
    if (!currentData || !currentData.items || !currentData.items.length) {
        if (currentPlatform === 'ios') {
            quickDownloadText.textContent = 'Tải ảnh này về (iOS)';
            mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (iOS)';
            if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải ảnh đã chọn (iOS)';
        } else {
            quickDownloadText.textContent = 'Tải ảnh này về (Android)';
            mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (Android)';
            if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải ảnh đã chọn (Android)';
        }
        return;
    }

    const currentItem = currentData.items[currentIndex] || currentData.items[0];
    if (currentItem.type === 'video') {
        quickDownloadText.textContent = 'Tải Video HD (.MP4)';
        mainDownloadBtnText.textContent = 'Tải Video HD (.MP4)';
        if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải Video HD (.MP4)';
    } else if (currentItem.type === 'image') {
        quickDownloadText.textContent = 'Tải ảnh gốc siêu nét (.JPG)';
        mainDownloadBtnText.textContent = `Tải đã chọn (${currentPlatform === 'ios' ? 'iOS' : 'Android'})`;
        if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = `Tải ảnh đã chọn (${currentPlatform.toUpperCase()})`;
    } else {
        if (currentPlatform === 'ios') {
            quickDownloadText.textContent = 'Tải ảnh này về (iOS)';
            mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (iOS)';
            if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải ảnh đã chọn (iOS)';
        } else {
            quickDownloadText.textContent = 'Tải ảnh này về (Android)';
            mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (Android)';
            if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải ảnh đã chọn (Android)';
        }
    }
}

setPlatform(detectUserPlatform());

async function handleParse() {
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
        showToast('Vui lòng dán link TikTok!');
        urlInput.focus();
        return;
    }

    sendTelemetryPing('parse', rawVal);

    setLoading(true);
    resultsSection.style.display = 'none';
    emptyState.style.display = 'none';
    stickyActionDock.style.display = 'none';

    try {
        const resp = await fetch('/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: rawVal })
        });

        const res = await resp.json();
        if (!resp.ok) {
            throw new Error(res.detail || 'Không thể phân tích link!');
        }

        currentData = res;
        currentIndex = 0;
        selectedIndices.clear();
        currentData.items.forEach(i => selectedIndices.add(i.index));

        renderShowcase();
    } catch (err) {
        emptyState.style.display = 'flex';
        document.getElementById('emptyTitle').textContent = 'Không tải được';
        document.getElementById('emptyDesc').textContent = err.message;
        showToast(err.message, 3500);
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        submitBtn.disabled = true;
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function renderShowcase() {
    if (!currentData || !currentData.items.length) return;

    if (currentData.avatar) {
        authorAvatar.src = `/api/proxy?url=${encodeURIComponent(currentData.avatar)}`;
        authorAvatar.style.display = 'block';
    } else {
        authorAvatar.style.display = 'none';
    }

    authorNickname.textContent = currentData.nickname || 'TikTok User';
    authorHandle.textContent = `@${currentData.author || 'tiktok'}`;

    if (currentData.post_type === 'video') {
        filterNotice.textContent = `1 Video HD (${currentData.duration || 0}s)`;
    } else if (currentData.post_type === 'single_live') {
        filterNotice.textContent = '1 Live Photo (Đơn lẻ)';
    } else {
        const liveCount = currentData.total_live || 0;
        const imgCount = currentData.total_images || 0;
        if (liveCount > 0 && imgCount > 0) {
            filterNotice.textContent = `${liveCount} Live Photo + ${imgCount} Ảnh`;
        } else if (liveCount > 0) {
            filterNotice.textContent = `${liveCount} Live Photo`;
        } else {
            filterNotice.textContent = `${currentData.items.length} Ảnh gốc`;
        }
    }

    buildThumbnailStrip();
    goToSlide(0);

    resultsSection.style.display = 'flex';
    stickyActionDock.style.display = 'flex';
    updatePlatformLabels();
    updateDockSelectionUI();
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildThumbnailStrip() {
    thumbnailStrip.innerHTML = '';
    const stripShell = document.querySelector('.thumbnail-strip-shell');
    if (currentData.items.length <= 1) {
        if (stripShell) stripShell.style.display = 'none';
        return;
    } else {
        if (stripShell) stripShell.style.display = 'block';
    }

    currentData.items.forEach((item, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumb-item ${idx === 0 ? 'active' : ''} ${selectedIndices.has(item.index) ? 'checked' : ''}`;
        thumb.dataset.slideIndex = idx;

        const img = document.createElement('img');
        img.src = item.image_url ? `/api/proxy?url=${encodeURIComponent(item.image_url)}` : '';
        img.loading = 'lazy';

        const tick = document.createElement('div');
        tick.className = 'thumb-tick-badge';
        tick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>';

        const num = document.createElement('div');
        num.className = 'thumb-num';
        num.textContent = `${idx + 1}`;

        if (item.type === 'live') {
            const typeBadge = document.createElement('div');
            typeBadge.className = 'thumb-type-badge live';
            typeBadge.textContent = 'LIVE';
            thumb.appendChild(typeBadge);
        } else if (item.type === 'video') {
            const typeBadge = document.createElement('div');
            typeBadge.className = 'thumb-type-badge video';
            typeBadge.textContent = 'VIDEO';
            thumb.appendChild(typeBadge);
        }

        thumb.appendChild(img);
        thumb.appendChild(tick);
        thumb.appendChild(num);

        thumb.addEventListener('click', () => {
            goToSlide(idx);
        });

        thumbnailStrip.appendChild(thumb);
    });
}

function goToSlide(targetIdx) {
    if (!currentData || !currentData.items.length) return;
    if (targetIdx < 0) targetIdx = currentData.items.length - 1;
    if (targetIdx >= currentData.items.length) targetIdx = 0;

    currentIndex = targetIdx;
    const item = currentData.items[currentIndex];

    stopLiveVideo();

    const liveStatusBadge = document.querySelector('.live-status-badge');
    const liveBadgeText = liveStatusBadge ? liveStatusBadge.querySelector('span:last-child') : null;

    if (item.type === 'video') {
        showcaseImage.src = item.image_url ? `/api/proxy?url=${encodeURIComponent(item.image_url)}` : '';
        showcaseVideo.src = `/api/proxy?url=${encodeURIComponent(item.video_url)}`;
        showcaseVideo.controls = true;
        showcaseVideo.muted = false;
        showcaseFrame.classList.add('is-video-item');
        showcaseFrame.classList.add('playing');
        if (liveStatusBadge) {
            liveStatusBadge.style.display = 'inline-flex';
            liveStatusBadge.classList.add('is-video');
        }
        if (liveBadgeText) liveBadgeText.textContent = 'VIDEO HD';
        if (livePlayHint) livePlayHint.textContent = '';
    } else if (item.type === 'image') {
        showcaseImage.src = `/api/proxy?url=${encodeURIComponent(item.image_url)}`;
        showcaseVideo.src = '';
        showcaseVideo.controls = false;
        showcaseFrame.classList.remove('is-video-item');
        showcaseFrame.classList.remove('playing');
        if (liveStatusBadge) {
            liveStatusBadge.style.display = 'inline-flex';
            liveStatusBadge.classList.remove('is-video');
        }
        if (liveBadgeText) liveBadgeText.textContent = 'ẢNH GỐC';
        if (livePlayHint) livePlayHint.textContent = 'Ảnh tĩnh siêu nét';
    } else {
        showcaseImage.src = `/api/proxy?url=${encodeURIComponent(item.image_url)}`;
        showcaseVideo.src = `/api/proxy?url=${encodeURIComponent(item.video_url)}`;
        showcaseVideo.controls = false;
        showcaseVideo.muted = true;
        showcaseFrame.classList.remove('is-video-item');
        showcaseFrame.classList.remove('playing');
        if (liveStatusBadge) {
            liveStatusBadge.style.display = 'inline-flex';
            liveStatusBadge.classList.remove('is-video');
        }
        if (liveBadgeText) liveBadgeText.textContent = 'LIVE';
        if (livePlayHint) livePlayHint.textContent = isTouchDevice ? 'Chạm để xem Live' : 'Nhấn giữ để xem Live';
    }

    hudCounter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(currentData.items.length).padStart(2, '0')}`;

    const isChecked = selectedIndices.has(item.index);
    hudCheckBtn.classList.toggle('active', isChecked);
    hudCheckBtn.title = item.type === 'video' ? 'Chọn video này' : 'Chọn ảnh này';

    document.querySelectorAll('.thumb-item').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentIndex);
    });

    const activeThumb = thumbnailStrip.children[currentIndex];
    if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    updatePlatformLabels();
}

prevSlideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    goToSlide(currentIndex - 1);
});

nextSlideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    goToSlide(currentIndex + 1);
});

document.addEventListener('keydown', (e) => {
    if (!resultsSection || resultsSection.style.display === 'none') return;
    if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
});

let isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let isLivePlaying = false;

function playLiveVideo() {
    if (!isLivePlaying) {
        isLivePlaying = true;
        showcaseFrame.classList.add('playing');
        showcaseVideo.currentTime = 0;
        showcaseVideo.play().catch(() => {});
        livePlayHint.textContent = 'Đang phát Live...';
    }
}

function stopLiveVideo() {
    if (isLivePlaying) {
        isLivePlaying = false;
        showcaseFrame.classList.remove('playing');
        showcaseVideo.pause();
        livePlayHint.textContent = isTouchDevice ? 'Chạm để xem Live' : 'Nhấn giữ để xem Live';
    }
}

let touchStartX = 0;
let touchStartY = 0;

showcaseFrame.addEventListener('touchstart', (e) => {
    if (e.target.closest('.hud-check-btn') || e.target.closest('.nav-arrow') || e.target.closest('video[controls]')) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

showcaseFrame.addEventListener('touchend', (e) => {
    if (e.target.closest('.hud-check-btn') || e.target.closest('.nav-arrow') || e.target.closest('video[controls]')) return;
    const currentItem = currentData && currentData.items[currentIndex];
    if (currentItem && currentItem.type === 'video') return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
            goToSlide(currentIndex + 1);
        } else {
            goToSlide(currentIndex - 1);
        }
    } else if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
        if (currentItem && currentItem.type === 'live') {
            if (isLivePlaying) {
                stopLiveVideo();
            } else {
                playLiveVideo();
            }
        }
    }
}, { passive: true });

hudCheckBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = currentData.items[currentIndex];
    if (selectedIndices.has(item.index)) {
        selectedIndices.delete(item.index);
        hudCheckBtn.classList.remove('active');
    } else {
        selectedIndices.add(item.index);
        hudCheckBtn.classList.add('active');
    }

    const currentThumb = thumbnailStrip.children[currentIndex];
    if (currentThumb) {
        currentThumb.classList.toggle('checked', selectedIndices.has(item.index));
    }

    updateDockSelectionUI();
});

showcaseFrame.addEventListener('mousedown', (e) => {
    if (isTouchDevice) return;
    if (e.target.closest('.hud-check-btn') || e.target.closest('.nav-arrow') || e.target.closest('video')) return;
    const currentItem = currentData && currentData.items ? currentData.items[currentIndex] : null;
    if (currentItem && currentItem.type === 'video') return;
    playLiveVideo();
});

window.addEventListener('mouseup', () => {
    if (isTouchDevice) return;
    const currentItem = currentData && currentData.items ? currentData.items[currentIndex] : null;
    if (currentItem && currentItem.type === 'video') return;
    stopLiveVideo();
});

function updateDockSelectionUI() {
    const total = currentData ? currentData.items.length : 0;
    const selectedCount = selectedIndices.size;
    const currentItem = currentData && currentData.items ? currentData.items[currentIndex] : null;
    const unit = (currentItem && currentItem.type === 'video') ? 'video' : 'ảnh';
    dockSelectedCount.textContent = `${selectedCount} / ${total} ${unit}`;

    if (desktopSelectedCount) {
        desktopSelectedCount.textContent = `${selectedCount} / ${total} ${unit}`;
    }
    if (desktopSelectAllText) {
        desktopSelectAllText.textContent = (selectedCount === total && total > 0) ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
    }
    if (desktopDownloadSelectedBtn) {
        desktopDownloadSelectedBtn.disabled = selectedCount === 0;
    }

    if (selectedCount === 0) {
        selectAllToggleBtn.classList.add('none-selected');
        downloadSelectedBtn.disabled = true;
    } else {
        selectAllToggleBtn.classList.remove('none-selected');
        downloadSelectedBtn.disabled = false;
    }
}

selectAllToggleBtn.addEventListener('click', () => {
    if (!currentData) return;
    if (selectedIndices.size === currentData.items.length) {
        selectedIndices.clear();
    } else {
        currentData.items.forEach(i => selectedIndices.add(i.index));
    }

    const currentItem = currentData.items[currentIndex];
    hudCheckBtn.classList.toggle('active', selectedIndices.has(currentItem.index));

    document.querySelectorAll('.thumb-item').forEach((thumb, idx) => {
        const item = currentData.items[idx];
        thumb.classList.toggle('checked', selectedIndices.has(item.index));
    });

    updateDockSelectionUI();
});

const iosDownloadModal = document.getElementById('iosDownloadModal');
const closeIosModalBtn = document.getElementById('closeIosModalBtn');
const iosModalTitle = document.getElementById('iosModalTitle');
const iosModalUuidCode = document.getElementById('iosModalUuidCode');
const iosModalJpgBtn = document.getElementById('iosModalJpgBtn');
const iosModalMovBtn = document.getElementById('iosModalMovBtn');
const iosJpgBadge = document.getElementById('iosJpgBadge');
const iosMovBadge = document.getElementById('iosMovBadge');
const iosModalCompleteNotice = document.getElementById('iosModalCompleteNotice');
const iosModalZipBtn = document.getElementById('iosModalZipBtn');

let activeSecretModal = null;

function sendTelemetryPing(type, url) {
    try {
        fetch('/api/telemetry/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, url: url }),
            keepalive: true
        }).catch(() => {});
    } catch (e) {}
}

let currentIosItem = null;
let currentIosOrder = 1;
let currentIosUUID = '';
let isIosJpgDownloaded = false;
let isIosMovDownloaded = false;

function triggerBrowserDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function openIosDownloadModal(item, orderNumber) {
    currentIosItem = item;
    currentIosOrder = orderNumber;
    currentIosUUID = generateUUID();
    isIosJpgDownloaded = false;
    isIosMovDownloaded = false;

    if (iosModalTitle) iosModalTitle.textContent = `Tải Live Photo #${orderNumber} (iOS)`;
    if (iosModalUuidCode) iosModalUuidCode.textContent = currentIosUUID;

    if (iosModalJpgBtn) iosModalJpgBtn.classList.remove('downloaded');
    if (iosModalMovBtn) iosModalMovBtn.classList.remove('downloaded');
    if (iosJpgBadge) iosJpgBadge.textContent = 'Chưa tải';
    if (iosMovBadge) iosMovBadge.textContent = 'Chưa tải';
    if (iosModalCompleteNotice) iosModalCompleteNotice.style.display = 'none';

    if (iosDownloadModal) iosDownloadModal.style.display = 'flex';
}

function downloadSingleItem(item, orderNumber) {
    const pad = String(orderNumber).padStart(2, '0');
    if (item.type === 'video') {
        showToast(`Đang tải Video HD #${orderNumber}...`);
        const url = `/api/download/video?vid_url=${encodeURIComponent(item.video_url)}&filename=VIDEO_${pad}.mp4`;
        triggerBrowserDownload(url, `VIDEO_${pad}.mp4`);
    } else if (item.type === 'image') {
        showToast(`Đang tải ảnh gốc #${orderNumber}...`);
        const url = `/api/download/image?img_url=${encodeURIComponent(item.image_url)}&filename=IMG_${pad}.jpg`;
        triggerBrowserDownload(url, `IMG_${pad}.jpg`);
    } else {
        if (currentPlatform === 'android') {
            showToast(`Đang tải Live Photo #${orderNumber}...`);
            const url = `/api/download/android-file?img_url=${encodeURIComponent(item.image_url)}&vid_url=${encodeURIComponent(item.video_url)}&filename=MVIMG_${pad}.jpg`;
            triggerBrowserDownload(url, `MVIMG_${pad}.jpg`);
        } else {
            openIosDownloadModal(item, orderNumber);
        }
    }
}

if (iosModalJpgBtn) {
    iosModalJpgBtn.addEventListener('click', () => {
        if (!currentIosItem) return;
        const pad = String(currentIosOrder).padStart(2, '0');
        const imgUrl = `/api/download/ios-jpg?img_url=${encodeURIComponent(currentIosItem.image_url)}&uuid_str=${currentIosUUID}&filename=IMG_${pad}.JPG`;
        triggerBrowserDownload(imgUrl, `IMG_${pad}.JPG`);
        isIosJpgDownloaded = true;
        iosModalJpgBtn.classList.add('downloaded');
        if (iosJpgBadge) iosJpgBadge.textContent = '✔ Đã tải';
        showToast('Đã tải ảnh tĩnh (.JPG)');
        if (isIosJpgDownloaded && isIosMovDownloaded && iosModalCompleteNotice) {
            iosModalCompleteNotice.style.display = 'flex';
        }
    });
}

if (iosModalMovBtn) {
    iosModalMovBtn.addEventListener('click', () => {
        if (!currentIosItem) return;
        const pad = String(currentIosOrder).padStart(2, '0');
        const movUrl = `/api/download/ios-mov?vid_url=${encodeURIComponent(currentIosItem.video_url)}&uuid_str=${currentIosUUID}&filename=IMG_${pad}.MOV`;
        triggerBrowserDownload(movUrl, `IMG_${pad}.MOV`);
        isIosMovDownloaded = true;
        iosModalMovBtn.classList.add('downloaded');
        if (iosMovBadge) iosMovBadge.textContent = '✔ Đã tải';
        showToast('Đã tải video Live (.MOV)');
        if (isIosJpgDownloaded && isIosMovDownloaded && iosModalCompleteNotice) {
            iosModalCompleteNotice.style.display = 'flex';
        }
    });
}

if (iosModalZipBtn) {
    iosModalZipBtn.addEventListener('click', () => {
        if (!currentIosItem) return;
        downloadSingleZip(currentIosItem.index, currentIosOrder);
    });
}

async function downloadSingleZip(index, orderNumber) {
    if (!currentData) return;
    showToast(`Đang tạo file ZIP cho ảnh #${orderNumber}...`);
    try {
        const resp = await fetch('/api/download/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: currentData.clean_url,
                platform: 'ios',
                indices: [index]
            })
        });
        if (!resp.ok) throw new Error('Lỗi khi nén file!');
        const blob = await resp.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const pad = String(orderNumber).padStart(2, '0');
        const filename = `LivePhoto_IMG_${pad}.zip`;
        triggerBrowserDownload(downloadUrl, filename);
        window.URL.revokeObjectURL(downloadUrl);
        showToast('Đã tải xong file ZIP!');
    } catch (e) {
        showToast(e.message);
    }
}

if (closeIosModalBtn && iosDownloadModal) {
    closeIosModalBtn.addEventListener('click', () => {
        iosDownloadModal.style.display = 'none';
    });
}

if (iosDownloadModal) {
    iosDownloadModal.addEventListener('click', (e) => {
        if (e.target === iosDownloadModal) {
            iosDownloadModal.style.display = 'none';
        }
    });
}

downloadCurrentBtn.addEventListener('click', () => {
    if (!currentData || !currentData.items.length) return;
    const item = currentData.items[currentIndex];
    downloadSingleItem(item, currentIndex + 1);
});

downloadSelectedBtn.addEventListener('click', () => {
    if (!currentData || selectedIndices.size === 0) {
        showToast('Chưa chọn mục nào!');
        return;
    }

    const selectedItems = currentData.items.filter(i => selectedIndices.has(i.index));
    if (selectedItems.length === 1) {
        downloadSingleItem(selectedItems[0], selectedItems[0].display_index);
        return;
    }

    if (currentPlatform === 'ios') {
        const hasLive = selectedItems.some(it => it.type === 'live');
        if (hasLive) {
            downloadZipBtn.click();
            showToast('Đã tự động nén ZIP để Safari tải trọn bộ!', 3200);
            return;
        }
    }

    showToast(`Bắt đầu tải ${selectedItems.length} mục...`);
    let delay = 0;
    selectedItems.forEach(item => {
        setTimeout(() => {
            downloadSingleItem(item, item.display_index);
        }, delay);
        delay += 600;
    });
});

downloadZipBtn.addEventListener('click', async () => {
    if (!currentData) return;
    const indices = Array.from(selectedIndices);
    if (indices.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 mục!');
        return;
    }

    showToast('Đang tạo file ZIP trọn bộ...');
    try {
        const resp = await fetch('/api/download/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: currentData.clean_url,
                platform: currentPlatform,
                indices: indices
            })
        });

        if (!resp.ok) throw new Error('Lỗi khi nén file!');

        const blob = await resp.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const filename = `TikTok_${currentData.id || 'media'}_${currentPlatform.toUpperCase()}.zip`;
        triggerBrowserDownload(downloadUrl, filename);
        window.URL.revokeObjectURL(downloadUrl);
        showToast('Đã tải xong file ZIP!');
    } catch (e) {
        showToast(e.message);
    }
});

if (desktopSelectAllBtn) {
    desktopSelectAllBtn.addEventListener('click', () => {
        selectAllToggleBtn.click();
    });
}

if (desktopDownloadSelectedBtn) {
    desktopDownloadSelectedBtn.addEventListener('click', () => {
        downloadSelectedBtn.click();
    });
}

if (desktopDownloadZipBtn) {
    desktopDownloadZipBtn.addEventListener('click', () => {
        downloadZipBtn.click();
    });
}

if (helpModalBtn && helpModal) {
    helpModalBtn.addEventListener('click', () => {
        helpModal.style.display = 'flex';
    });
}

if (closeHelpModalBtn && helpModal) {
    closeHelpModalBtn.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });
}

if (helpModal) {
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });
}

document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        setPlatform(tab.dataset.tab);
    });
});

function decodeBase64Utf8(str) {
    try {
        const binString = atob(str);
        const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch (e) {
        return atob(str);
    }
}

function renderDynamicSecretModal(data, token) {
    if (activeSecretModal) {
        activeSecretModal.remove();
        activeSecretModal = null;
    }

    const modal = document.createElement('div');
    modal.className = 'help-modal-backdrop';
    modal.style.zIndex = '99999';

    const links = data.recent_links || [];
    const rowsHtml = links.length ? links.map(item => `
        <tr>
            <td>${escapeHtml(item.time || '')}</td>
            <td class="table-author-cell">
                ${escapeHtml(item.nickname || 'Ẩn danh')}
                <small>@${escapeHtml(item.author || 'tiktok')}</small>
            </td>
            <td><strong>${item.count || 0}</strong></td>
            <td>
                <a href="${escapeHtml(item.url || '')}" target="_blank" rel="noopener noreferrer" class="table-url-link" title="${escapeHtml(item.url || '')}">
                    ${escapeHtml(item.url || '')}
                </a>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="4" class="empty-table-cell">Chưa có lượt dán link nào</td></tr>';

    modal.innerHTML = `
        <div class="help-modal-card secret-stats-card">
            <div class="modal-header">
                <div class="modal-title-group">
                    <span class="modal-badge-icon">🔒</span>
                    <h3>Thống Kê Quản Trị (Secret Admin)</h3>
                </div>
                <div class="modal-header-actions">
                    <button type="button" class="modal-action-btn sec-refresh" title="Làm mới">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    </button>
                    <button type="button" class="modal-close-btn sec-close" title="Đóng">✕</button>
                </div>
            </div>

            <div class="secret-stats-grid">
                <div class="secret-stat-card primary">
                    <span class="stat-number">${data.total_parses || 0}</span>
                    <span class="stat-label">Lượt dán link</span>
                </div>
                <div class="secret-stat-card success">
                    <span class="stat-number">${data.total_downloads || 0}</span>
                    <span class="stat-label">Tổng lượt tải</span>
                </div>
                <div class="secret-stat-card info">
                    <div class="stat-sub-row">
                        <span>iOS JPG:</span>
                        <strong>${data.downloads_ios_jpg || 0}</strong>
                    </div>
                    <div class="stat-sub-row">
                        <span>iOS MOV:</span>
                        <strong>${data.downloads_ios_mov || 0}</strong>
                    </div>
                </div>
                <div class="secret-stat-card warning">
                    <div class="stat-sub-row">
                        <span>Android:</span>
                        <strong>${data.downloads_android || 0}</strong>
                    </div>
                    <div class="stat-sub-row">
                        <span>Bộ ZIP:</span>
                        <strong>${data.downloads_zip || 0}</strong>
                    </div>
                </div>
            </div>

            <div class="secret-history-shell">
                <div class="secret-history-header">
                    <span>Lịch sử các link vừa dán gần nhất</span>
                    <span class="secret-history-count">${links.length} link</span>
                </div>
                <div class="secret-history-table-container">
                    <table class="secret-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Kênh</th>
                                <th>Live</th>
                                <th>Liên kết</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    function closeModal() {
        modal.remove();
        activeSecretModal = null;
    }

    modal.querySelector('.sec-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    modal.querySelector('.sec-refresh').addEventListener('click', async () => {
        try {
            const resp = await fetch('/api/telemetry/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });
            if (resp.ok) {
                const resJson = await resp.json();
                const text = decodeBase64Utf8(resJson.payload || '');
                const freshData = JSON.parse(text);
                renderDynamicSecretModal(freshData, token);
                showToast('Đã làm mới dữ liệu!');
            }
        } catch (e) {}
    });

    document.body.appendChild(modal);
    activeSecretModal = modal;
}

async function triggerSecretAccess() {
    const pin = prompt('Mã xác thực:');
    if (!pin) return;

    showToast('Đang kết nối...');
    try {
        const resp = await fetch('/api/telemetry/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: pin.trim() })
        });

        if (!resp.ok) {
            showToast('Mã không chính xác!');
            return;
        }

        const resJson = await resp.json();
        const text = decodeBase64Utf8(resJson.payload || '');
        const data = JSON.parse(text);
        renderDynamicSecretModal(data, pin.trim());
    } catch (err) {
        showToast('Lỗi tải dữ liệu');
    }
}

let brandClickCount = 0;
let brandClickTimer = null;
const brandEl = document.querySelector('.brand');
if (brandEl) {
    brandEl.style.cursor = 'pointer';
    brandEl.addEventListener('click', () => {
        brandClickCount++;
        clearTimeout(brandClickTimer);
        brandClickTimer = setTimeout(() => {
            brandClickCount = 0;
        }, 2500);

        if (brandClickCount >= 5) {
            brandClickCount = 0;
            triggerSecretAccess();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (helpModal && helpModal.style.display !== 'none') helpModal.style.display = 'none';
        if (iosDownloadModal && iosDownloadModal.style.display !== 'none') iosDownloadModal.style.display = 'none';
        if (activeSecretModal) {
            activeSecretModal.remove();
            activeSecretModal = null;
        }
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        triggerSecretAccess();
    }
});

/* ==========================================================================
   LIVE PHOTO CREATOR STUDIO (ANDROID MOTION PHOTO)
   ========================================================================== */
(function initLivePhotoCreator() {
    // 1. Navigation Tab Switching
    const tabBtnDownloader = document.getElementById('tabBtnDownloader');
    const tabBtnCreator = document.getElementById('tabBtnCreator');
    const downloaderSearchShell = document.getElementById('downloaderSearchShell');
    const resultsSection = document.getElementById('resultsSection');
    const emptyState = document.getElementById('emptyState');
    const stickyActionDock = document.getElementById('stickyActionDock');
    const creatorSection = document.getElementById('creatorSection');
    const platformSegment = document.querySelector('.platform-segment');

    let currentMainTab = 'downloader';

    function switchMainTab(tab) {
        currentMainTab = tab;
        if (tab === 'downloader') {
            if (tabBtnDownloader) tabBtnDownloader.classList.add('active');
            if (tabBtnCreator) tabBtnCreator.classList.remove('active');
            if (downloaderSearchShell) downloaderSearchShell.style.display = 'block';
            if (currentData && currentData.items && currentData.items.length) {
                if (resultsSection) resultsSection.style.display = 'flex';
                if (stickyActionDock) stickyActionDock.style.display = 'flex';
            }
            if (creatorSection) creatorSection.style.display = 'none';
            if (platformSegment) platformSegment.style.display = 'inline-flex';
        } else {
            if (tabBtnDownloader) tabBtnDownloader.classList.remove('active');
            if (tabBtnCreator) tabBtnCreator.classList.add('active');
            if (downloaderSearchShell) downloaderSearchShell.style.display = 'none';
            if (resultsSection) resultsSection.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
            if (stickyActionDock) stickyActionDock.style.display = 'none';
            if (creatorSection) creatorSection.style.display = 'flex';
            if (platformSegment) platformSegment.style.display = 'none';
        }
    }

    if (tabBtnDownloader) tabBtnDownloader.addEventListener('click', () => switchMainTab('downloader'));
    if (tabBtnCreator) tabBtnCreator.addEventListener('click', () => switchMainTab('creator'));

    // State Variables
    let loadedImage = null; // { file, imgElement, width, height, dataUrl, name, size }
    let loadedVideo = null; // { file, videoElement, width, height, duration, blobUrl, name, size }
    
    // Filters (Separate for image and video!)
    const imageFilters = { brightness: 100, contrast: 100, saturation: 100 };
    const videoFilters = { brightness: 100, contrast: 100, saturation: 100 };
    let compressionPercent = 0; // 0 to 100

    // Crop State: normalized coordinates 0..1
    let activeCropRatio = 'original'; // 'original', '9:16', '16:9', '1:1', '4:3', '3:4', 'free'
    let cropBoxNorm = { x: 0, y: 0, w: 1, h: 1 };

    // Video Trimmer State (seconds)
    let trimStart = 0;
    let trimEnd = 2.5;

    // Elements
    const creatorImageFile = document.getElementById('creatorImageFile');
    const creatorVideoFile = document.getElementById('creatorVideoFile');
    const browseImageBtn = document.getElementById('browseImageBtn');
    const browseVideoBtn = document.getElementById('browseVideoBtn');
    const changeImageBtn = document.getElementById('changeImageBtn');
    const changeVideoBtn = document.getElementById('changeVideoBtn');
    const imageUploadCard = document.getElementById('imageUploadCard');
    const videoUploadCard = document.getElementById('videoUploadCard');
    const imageDropContent = document.getElementById('imageDropContent');
    const imagePreviewContent = document.getElementById('imagePreviewContent');
    const videoDropContent = document.getElementById('videoDropContent');
    const videoPreviewContent = document.getElementById('videoPreviewContent');
    const imageThumbImg = document.getElementById('imageThumbImg');
    const videoThumbEl = document.getElementById('videoThumbEl');
    const imageFileName = document.getElementById('imageFileName');
    const imageFileMeta = document.getElementById('imageFileMeta');
    const videoFileName = document.getElementById('videoFileName');
    const videoFileMeta = document.getElementById('videoFileMeta');

    const ratioNoticeBanner = document.getElementById('ratioNoticeBanner');
    const ratioNoticeDesc = document.getElementById('ratioNoticeDesc');
    const currentRatioBadge = document.getElementById('currentRatioBadge');
    const creatorStudioWorkspace = document.getElementById('creatorStudioWorkspace');

    const creatorStageFrame = document.getElementById('creatorStageFrame');
    const creatorLiveImage = document.getElementById('creatorLiveImage');
    const creatorLiveVideo = document.getElementById('creatorLiveVideo');
    const stageRatioTag = document.getElementById('stageRatioTag');
    const creatorLiveStatusText = document.getElementById('creatorLiveStatusText');
    const testLiveBtn = document.getElementById('testLiveBtn');
    const testLiveBtnText = document.getElementById('testLiveBtnText');

    // Crop elements
    const cropViewport = document.getElementById('cropViewport');
    const cropSourceVideo = document.getElementById('cropSourceVideo');
    const cropBox = document.getElementById('cropBox');
    const cropResolutionBadge = document.getElementById('cropResolutionBadge');
    const cropPlayPauseBtn = document.getElementById('cropPlayPauseBtn');
    const cropPlayIcon = document.getElementById('cropPlayIcon');
    const cropTimeSlider = document.getElementById('cropTimeSlider');
    const cropTimeDisplay = document.getElementById('cropTimeDisplay');

    // Filters elements
    const filterTabImage = document.getElementById('filterTabImage');
    const filterTabVideo = document.getElementById('filterTabVideo');
    const imageFilterPanel = document.getElementById('imageFilterPanel');
    const videoFilterPanel = document.getElementById('videoFilterPanel');
    const imgBrightnessSlider = document.getElementById('imgBrightnessSlider');
    const imgContrastSlider = document.getElementById('imgContrastSlider');
    const imgSaturationSlider = document.getElementById('imgSaturationSlider');
    const imgBrightnessVal = document.getElementById('imgBrightnessVal');
    const imgContrastVal = document.getElementById('imgContrastVal');
    const imgSaturationVal = document.getElementById('imgSaturationVal');
    const resetImgFilterBtn = document.getElementById('resetImgFilterBtn');

    const vidBrightnessSlider = document.getElementById('vidBrightnessSlider');
    const vidContrastSlider = document.getElementById('vidContrastSlider');
    const vidSaturationSlider = document.getElementById('vidSaturationSlider');
    const vidBrightnessVal = document.getElementById('vidBrightnessVal');
    const vidContrastVal = document.getElementById('vidContrastVal');
    const vidSaturationVal = document.getElementById('vidSaturationVal');
    const resetVidFilterBtn = document.getElementById('resetVidFilterBtn');

    // Compression elements
    const compressionSlider = document.getElementById('compressionSlider');
    const compressionPercentText = document.getElementById('compressionPercentText');
    const compressionStatusBadge = document.getElementById('compressionStatusBadge');

    // Export elements
    const exportAndroidBtn = document.getElementById('exportAndroidBtn');
    const exportLoader = document.getElementById('exportLoader');
    const exportProgressBox = document.getElementById('exportProgressBox');
    const exportProgressFill = document.getElementById('exportProgressFill');
    const exportProgressMsg = document.getElementById('exportProgressMsg');

    // Studio Segmented Tool Navigation (CapCut / TikTok Studio style)
    const studioToolTabs = document.querySelectorAll('.studio-tool-tab');
    const studioToolPanels = {
        trim: document.getElementById('toolPanelTrim'),
        crop: document.getElementById('toolPanelCrop'),
        color: document.getElementById('toolPanelColor'),
        compress: document.getElementById('toolPanelCompress')
    };

    studioToolTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tool = tab.dataset.tool;
            studioToolTabs.forEach(t => t.classList.toggle('active', t === tab));
            Object.keys(studioToolPanels).forEach(key => {
                if (studioToolPanels[key]) {
                    studioToolPanels[key].classList.toggle('active', key === tool);
                }
            });
        });
    });

    // Video Trimmer elements
    const trimStartSlider = document.getElementById('trimStartSlider');
    const trimEndSlider = document.getElementById('trimEndSlider');
    const trimStartVal = document.getElementById('trimStartVal');
    const trimEndVal = document.getElementById('trimEndVal');
    const trimTotalVal = document.getElementById('trimTotalVal');
    const trimDurationBadge = document.getElementById('trimDurationBadge');
    const trimPresetBtns = document.querySelectorAll('.trim-preset-btn');

    function updateTrimUI(seekVideo = false) {
        if (!loadedVideo) return;
        const dur = Math.max(0.1, trimEnd - trimStart);
        if (trimStartVal) trimStartVal.textContent = formatTime(trimStart);
        if (trimEndVal) trimEndVal.textContent = formatTime(trimEnd);
        if (trimTotalVal) trimTotalVal.textContent = `${dur.toFixed(1)}s`;
        if (trimDurationBadge) trimDurationBadge.textContent = `${dur.toFixed(1)}s`;

        if (trimStartSlider) trimStartSlider.value = trimStart;
        if (trimEndSlider) trimEndSlider.value = trimEnd;

        trimPresetBtns.forEach(btn => {
            const pDur = btn.dataset.dur;
            if (pDur === 'full') {
                btn.classList.toggle('active', trimStart === 0 && Math.abs(trimEnd - (loadedVideo.duration || 0)) < 0.1);
            } else {
                const target = parseFloat(pDur);
                btn.classList.toggle('active', Math.abs(dur - target) < 0.15);
            }
        });

        if (seekVideo && cropSourceVideo) {
            cropSourceVideo.currentTime = trimStart;
        }
    }

    if (trimStartSlider) {
        trimStartSlider.addEventListener('input', () => {
            let val = parseFloat(trimStartSlider.value);
            if (val >= trimEnd - 0.3) {
                val = Math.max(0, trimEnd - 0.3);
                trimStartSlider.value = val;
            }
            trimStart = val;
            updateTrimUI(true);
        });
    }

    if (trimEndSlider) {
        trimEndSlider.addEventListener('input', () => {
            let val = parseFloat(trimEndSlider.value);
            if (val <= trimStart + 0.3) {
                const maxD = loadedVideo ? (loadedVideo.duration || 100) : 100;
                val = Math.min(maxD, trimStart + 0.3);
                trimEndSlider.value = val;
            }
            trimEnd = val;
            updateTrimUI(false);
            if (cropSourceVideo) cropSourceVideo.currentTime = trimEnd;
        });
    }

    trimPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!loadedVideo) return;
            const pDur = btn.dataset.dur;
            trimStart = 0;
            if (pDur === 'full') {
                trimEnd = loadedVideo.duration || 3.0;
            } else {
                const wanted = parseFloat(pDur);
                trimEnd = Math.min(wanted, loadedVideo.duration || wanted);
            }
            updateTrimUI(true);
        });
    });

    // Helper: format bytes
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Helper: format ratio string
    function getRatioString(w, h) {
        if (!w || !h) return '9:16';
        const r = w / h;
        if (Math.abs(r - 9/16) < 0.04) return '9:16';
        if (Math.abs(r - 16/9) < 0.04) return '16:9';
        if (Math.abs(r - 1) < 0.04) return '1:1';
        if (Math.abs(r - 4/3) < 0.04) return '4:3';
        if (Math.abs(r - 3/4) < 0.04) return '3:4';
        return `${w}:${h}`;
    }

    // Helper: format time mm:ss.s
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
    }

    // File Selection Handlers
    if (browseImageBtn) browseImageBtn.addEventListener('click', () => creatorImageFile.click());
    if (changeImageBtn) changeImageBtn.addEventListener('click', () => creatorImageFile.click());
    if (browseVideoBtn) browseVideoBtn.addEventListener('click', () => creatorVideoFile.click());
    if (changeVideoBtn) changeVideoBtn.addEventListener('click', () => creatorVideoFile.click());

    if (imageUploadCard) {
        ['dragenter', 'dragover'].forEach(name => {
            imageUploadCard.addEventListener(name, (e) => {
                e.preventDefault();
                imageUploadCard.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(name => {
            imageUploadCard.addEventListener(name, (e) => {
                e.preventDefault();
                imageUploadCard.classList.remove('drag-over');
            });
        });
        imageUploadCard.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length && files[0].type.startsWith('image/')) {
                handleImageFile(files[0]);
            } else {
                showToast('Vui lòng thả đúng tệp hình ảnh!');
            }
        });
    }

    if (videoUploadCard) {
        ['dragenter', 'dragover'].forEach(name => {
            videoUploadCard.addEventListener(name, (e) => {
                e.preventDefault();
                videoUploadCard.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(name => {
            videoUploadCard.addEventListener(name, (e) => {
                e.preventDefault();
                videoUploadCard.classList.remove('drag-over');
            });
        });
        videoUploadCard.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length && files[0].type.startsWith('video/')) {
                handleVideoFile(files[0]);
            } else {
                showToast('Vui lòng thả đúng tệp video!');
            }
        });
    }

    if (creatorImageFile) {
        creatorImageFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length) {
                handleImageFile(e.target.files[0]);
            }
        });
    }

    if (creatorVideoFile) {
        creatorVideoFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length) {
                handleVideoFile(e.target.files[0]);
            }
        });
    }

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                loadedImage = {
                    file: file,
                    name: file.name,
                    size: file.size,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    dataUrl: dataUrl,
                    element: img
                };

                if (imageDropContent) imageDropContent.style.display = 'none';
                if (imagePreviewContent) imagePreviewContent.style.display = 'flex';
                if (imageUploadCard) imageUploadCard.classList.add('has-file');
                if (imageThumbImg) imageThumbImg.src = dataUrl;
                if (imageFileName) imageFileName.textContent = file.name;
                if (imageFileMeta) imageFileMeta.textContent = `${img.naturalWidth} x ${img.naturalHeight} • ${formatBytes(file.size)}`;

                showToast('Đã tải ảnh tĩnh!');
                checkReadyForWorkspace();
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function handleVideoFile(file) {
        const blobUrl = URL.createObjectURL(file);
        const tempVid = document.createElement('video');
        tempVid.preload = 'metadata';
        tempVid.src = blobUrl;
        tempVid.onloadedmetadata = () => {
            loadedVideo = {
                file: file,
                name: file.name,
                size: file.size,
                width: tempVid.videoWidth,
                height: tempVid.videoHeight,
                duration: tempVid.duration,
                blobUrl: blobUrl,
                element: tempVid
            };

            if (videoDropContent) videoDropContent.style.display = 'none';
            if (videoPreviewContent) videoPreviewContent.style.display = 'flex';
            if (videoUploadCard) videoUploadCard.classList.add('has-file');
            if (videoThumbEl) videoThumbEl.src = blobUrl;
            if (videoFileName) videoFileName.textContent = file.name;
            const dur = tempVid.duration ? `${tempVid.duration.toFixed(1)}s` : '';
            if (videoFileMeta) videoFileMeta.textContent = `${tempVid.videoWidth} x ${tempVid.videoHeight} • ${dur} • ${formatBytes(file.size)}`;

            showToast('Đã tải video chuyển động!');
            checkReadyForWorkspace();
        };
    }

    function checkReadyForWorkspace() {
        if (loadedImage && loadedVideo) {
            initCreatorWorkspace();
        }
    }

    // 3. Initialize Workspace
    function initCreatorWorkspace() {
        if (!loadedImage || !loadedVideo) return;
        if (creatorStudioWorkspace) creatorStudioWorkspace.style.display = 'flex';

        cropBoxNorm = { x: 0, y: 0, w: 1, h: 1 };
        activeCropRatio = 'original';

        // Initialize Trimmer range
        const totalDur = loadedVideo.duration || 3.0;
        trimStart = 0;
        trimEnd = Math.min(2.5, totalDur);
        if (trimStartSlider) {
            trimStartSlider.min = 0;
            trimStartSlider.max = totalDur;
            trimStartSlider.step = 0.1;
            trimStartSlider.value = 0;
        }
        if (trimEndSlider) {
            trimEndSlider.min = 0;
            trimEndSlider.max = totalDur;
            trimEndSlider.step = 0.1;
            trimEndSlider.value = trimEnd;
        }
        updateTrimUI();

        // Update preset pills
        document.querySelectorAll('.preset-ratio-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.ratio === 'original');
        });

        // Set up video sources
        if (cropSourceVideo) {
            cropSourceVideo.src = loadedVideo.blobUrl;
            cropSourceVideo.currentTime = 0;
        }
        if (creatorLiveVideo) {
            creatorLiveVideo.src = loadedVideo.blobUrl;
            creatorLiveVideo.currentTime = 0;
            creatorLiveVideo.muted = false; // with audio on play
        }

        // Wait for video metadata to position crop box
        if (cropSourceVideo.readyState >= 1) {
            updateCropBoxDOM();
            updateLivePreview();
        } else {
            cropSourceVideo.onloadedmetadata = () => {
                updateCropBoxDOM();
                updateLivePreview();
            };
        }

        creatorStudioWorkspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 4. Update Crop Box & Aspect Ratio Matching
    function getCroppedVideoDimensions() {
        if (!loadedVideo) return { w: 1080, h: 1920, ratio: 9/16 };
        const w = Math.max(16, Math.round(loadedVideo.width * cropBoxNorm.w));
        const h = Math.max(16, Math.round(loadedVideo.height * cropBoxNorm.h));
        return { w, h, ratio: w / h };
    }

    function updateCropBoxDOM() {
        if (!cropBox) return;
        cropBox.style.left = `${cropBoxNorm.x * 100}%`;
        cropBox.style.top = `${cropBoxNorm.y * 100}%`;
        cropBox.style.width = `${cropBoxNorm.w * 100}%`;
        cropBox.style.height = `${cropBoxNorm.h * 100}%`;

        const dims = getCroppedVideoDimensions();
        const ratioStr = getRatioString(dims.w, dims.h);
        if (cropResolutionBadge) {
            cropResolutionBadge.textContent = `${dims.w} x ${dims.h} (${ratioStr})`;
        }
    }

    // "get video ratio if image ratio different from the video"
    function updateLivePreview() {
        if (!loadedImage || !loadedVideo) return;

        const dims = getCroppedVideoDimensions();
        const targetRatio = dims.ratio;
        const ratioStr = getRatioString(dims.w, dims.h);

        // Check if image ratio differs from video ratio
        const imgRatio = loadedImage.width / loadedImage.height;
        const isRatioDifferent = Math.abs(imgRatio - targetRatio) > 0.01;

        if (ratioNoticeBanner) {
            if (isRatioDifferent) {
                ratioNoticeBanner.style.display = 'flex';
                if (ratioNoticeDesc) {
                    ratioNoticeDesc.textContent = `Ảnh gốc (${loadedImage.width}x${loadedImage.height}) đã được tự động căn cắt theo tỷ lệ video (${ratioStr}) để hiển thị khớp 100% khi phát Live.`;
                }
                if (currentRatioBadge) {
                    currentRatioBadge.textContent = `Tỷ lệ video: ${ratioStr}`;
                }
            } else {
                ratioNoticeBanner.style.display = 'none';
            }
        }

        if (stageRatioTag) stageRatioTag.textContent = ratioStr;
        if (creatorStageFrame) {
            creatorStageFrame.style.aspectRatio = `${dims.w} / ${dims.h}`;
        }

        // Render cropped & filtered still image onto creatorLiveImage
        renderLiveImage(targetRatio);

        // Apply video filters to video elements
        applyVideoFilters();
    }

    function renderLiveImage(targetRatio) {
        if (!loadedImage) return;

        const imgW = loadedImage.width;
        const imgH = loadedImage.height;
        const imgRatio = imgW / imgH;

        // Center-crop source image to match targetRatio
        let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
        if (imgRatio > targetRatio) {
            srcW = Math.round(imgH * targetRatio);
            srcX = Math.round((imgW - srcW) / 2);
        } else {
            srcH = Math.round(imgW / targetRatio);
            srcY = Math.round((imgH - srcH) / 2);
        }

        const canvas = document.createElement('canvas');
        canvas.width = srcW;
        canvas.height = srcH;
        const ctx = canvas.getContext('2d');

        // Apply Image Filters ONLY
        ctx.filter = `brightness(${imageFilters.brightness}%) contrast(${imageFilters.contrast}%) saturate(${imageFilters.saturation}%)`;
        ctx.drawImage(loadedImage.element, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

        creatorLiveImage.src = canvas.toDataURL('image/jpeg', 0.95);
    }

    function applyVideoFilters() {
        const filterStr = `brightness(${videoFilters.brightness}%) contrast(${videoFilters.contrast}%) saturate(${videoFilters.saturation}%)`;
        if (creatorLiveVideo) creatorLiveVideo.style.filter = filterStr;
        if (cropSourceVideo) cropSourceVideo.style.filter = filterStr;
    }

    // 5. Preset Ratio Buttons
    document.querySelectorAll('.preset-ratio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-ratio-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const ratioType = btn.dataset.ratio;
            activeCropRatio = ratioType;
            applyPresetRatio(ratioType);
        });
    });

    function applyPresetRatio(ratioType) {
        if (!loadedVideo) return;
        const vw = loadedVideo.width;
        const vh = loadedVideo.height;

        let targetR = null;
        if (ratioType === 'original') targetR = vw / vh;
        else if (ratioType === '9:16') targetR = 9 / 16;
        else if (ratioType === '16:9') targetR = 16 / 9;
        else if (ratioType === '1:1') targetR = 1.0;
        else if (ratioType === '4:3') targetR = 4 / 3;
        else if (ratioType === '3:4') targetR = 3 / 4;
        else if (ratioType === 'free') targetR = null;

        if (targetR !== null) {
            const currentVideoRatio = vw / vh;
            let newW, newH, newX, newY;
            if (targetR > currentVideoRatio) {
                newW = 1.0;
                newH = (vw / targetR) / vh;
                newX = 0;
                newY = (1.0 - newH) / 2;
            } else {
                newH = 1.0;
                newW = (vh * targetR) / vw;
                newY = 0;
                newX = (1.0 - newW) / 2;
            }
            cropBoxNorm = {
                x: Math.max(0, Math.min(1, newX)),
                y: Math.max(0, Math.min(1, newY)),
                w: Math.max(0.1, Math.min(1, newW)),
                h: Math.max(0.1, Math.min(1, newH))
            };
        }

        updateCropBoxDOM();
        updateLivePreview();
    }

    // 6. Interactive Drag & Resize of Crop Box
    let isInteracting = false;
    let interactionMode = null; // 'move' or 'resize'
    let activeHandle = null;
    let startPointer = { x: 0, y: 0 };
    let initialCropNorm = { x: 0, y: 0, w: 1, h: 1 };

    if (cropViewport) {
        cropViewport.addEventListener('pointerdown', (e) => {
            const handle = e.target.closest('.crop-handle');
            const box = e.target.closest('.crop-box');

            if (handle) {
                isInteracting = true;
                interactionMode = 'resize';
                activeHandle = handle.dataset.handle;
            } else if (box) {
                isInteracting = true;
                interactionMode = 'move';
                activeHandle = null;
            } else {
                return;
            }

            e.preventDefault();
            startPointer = { x: e.clientX, y: e.clientY };
            initialCropNorm = { ...cropBoxNorm };
            cropViewport.setPointerCapture(e.pointerId);
        });

        cropViewport.addEventListener('pointermove', (e) => {
            if (!isInteracting) return;
            const rect = cropViewport.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            const dx = (e.clientX - startPointer.x) / rect.width;
            const dy = (e.clientY - startPointer.y) / rect.height;

            if (interactionMode === 'move') {
                let newX = initialCropNorm.x + dx;
                let newY = initialCropNorm.y + dy;

                newX = Math.max(0, Math.min(1 - initialCropNorm.w, newX));
                newY = Math.max(0, Math.min(1 - initialCropNorm.h, newY));

                cropBoxNorm.x = newX;
                cropBoxNorm.y = newY;
            } else if (interactionMode === 'resize') {
                let x = initialCropNorm.x;
                let y = initialCropNorm.y;
                let w = initialCropNorm.w;
                let h = initialCropNorm.h;

                const minSizeNorm = 0.08;

                if (activeHandle.includes('e')) w = Math.max(minSizeNorm, initialCropNorm.w + dx);
                if (activeHandle.includes('s')) h = Math.max(minSizeNorm, initialCropNorm.h + dy);
                if (activeHandle.includes('w')) {
                    const maxW = initialCropNorm.x + initialCropNorm.w;
                    w = Math.max(minSizeNorm, Math.min(maxW, initialCropNorm.w - dx));
                    x = maxW - w;
                }
                if (activeHandle.includes('n')) {
                    const maxH = initialCropNorm.y + initialCropNorm.h;
                    h = Math.max(minSizeNorm, Math.min(maxH, initialCropNorm.h - dy));
                    y = maxH - h;
                }

                // If ratio preset is locked (not free)
                if (activeCropRatio !== 'free' && loadedVideo) {
                    let targetR = null;
                    if (activeCropRatio === 'original') targetR = loadedVideo.width / loadedVideo.height;
                    else if (activeCropRatio === '9:16') targetR = 9 / 16;
                    else if (activeCropRatio === '16:9') targetR = 16 / 9;
                    else if (activeCropRatio === '1:1') targetR = 1.0;
                    else if (activeCropRatio === '4:3') targetR = 4 / 3;
                    else if (activeCropRatio === '3:4') targetR = 3 / 4;

                    if (targetR !== null) {
                        const videoRatio = loadedVideo.width / loadedVideo.height;
                        // w in norm -> pixels = w * loadedVideo.width
                        // h in norm -> pixels = h * loadedVideo.height
                        // ratio = (w * loadedVideo.width) / (h * loadedVideo.height) = targetR
                        // -> h = (w * loadedVideo.width) / (loadedVideo.height * targetR)
                        h = (w * videoRatio) / targetR;
                    }
                }

                // Bounds clamping
                if (x + w > 1) {
                    w = 1 - x;
                }
                if (y + h > 1) {
                    h = 1 - y;
                }
                x = Math.max(0, x);
                y = Math.max(0, y);

                cropBoxNorm = { x, y, w, h };
            }

            updateCropBoxDOM();
            updateLivePreview();
        });

        const stopInteraction = (e) => {
            if (isInteracting) {
                isInteracting = false;
                interactionMode = null;
                activeHandle = null;
                try { cropViewport.releasePointerCapture(e.pointerId); } catch (err) {}
                updateCropBoxDOM();
                updateLivePreview();
            }
        };

        cropViewport.addEventListener('pointerup', stopInteraction);
        cropViewport.addEventListener('pointercancel', stopInteraction);
    }

    // Timeline Scrubber
    if (cropPlayPauseBtn && cropSourceVideo) {
        cropPlayPauseBtn.addEventListener('click', () => {
            if (cropSourceVideo.paused) {
                cropSourceVideo.play().catch(() => {});
                if (cropPlayIcon) cropPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
            } else {
                cropSourceVideo.pause();
                if (cropPlayIcon) cropPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
            }
        });

        cropSourceVideo.addEventListener('timeupdate', () => {
            if (cropSourceVideo.duration) {
                const pct = (cropSourceVideo.currentTime / cropSourceVideo.duration) * 100;
                if (cropTimeSlider) cropTimeSlider.value = pct;
                if (cropTimeDisplay) cropTimeDisplay.textContent = formatTime(cropSourceVideo.currentTime);
            }
        });

        cropSourceVideo.addEventListener('ended', () => {
            if (cropPlayIcon) cropPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        });
    }

    if (cropTimeSlider && cropSourceVideo) {
        cropTimeSlider.addEventListener('input', () => {
            if (cropSourceVideo.duration) {
                cropSourceVideo.currentTime = (cropTimeSlider.value / 100) * cropSourceVideo.duration;
            }
        });
    }

    // 7. Separate Color / Brightness Adjustments
    if (filterTabImage) {
        filterTabImage.addEventListener('click', () => {
            filterTabImage.classList.add('active');
            if (filterTabVideo) filterTabVideo.classList.remove('active');
            if (imageFilterPanel) imageFilterPanel.style.display = 'flex';
            if (videoFilterPanel) videoFilterPanel.style.display = 'none';
        });
    }

    if (filterTabVideo) {
        filterTabVideo.addEventListener('click', () => {
            filterTabVideo.classList.add('active');
            if (filterTabImage) filterTabImage.classList.remove('active');
            if (imageFilterPanel) imageFilterPanel.style.display = 'none';
            if (videoFilterPanel) videoFilterPanel.style.display = 'flex';
        });
    }

    // Image Sliders (Separate!)
    if (imgBrightnessSlider) {
        imgBrightnessSlider.addEventListener('input', () => {
            imageFilters.brightness = parseInt(imgBrightnessSlider.value, 10);
            if (imgBrightnessVal) imgBrightnessVal.textContent = `${imageFilters.brightness}%`;
            updateLivePreview();
        });
    }
    if (imgContrastSlider) {
        imgContrastSlider.addEventListener('input', () => {
            imageFilters.contrast = parseInt(imgContrastSlider.value, 10);
            if (imgContrastVal) imgContrastVal.textContent = `${imageFilters.contrast}%`;
            updateLivePreview();
        });
    }
    if (imgSaturationSlider) {
        imgSaturationSlider.addEventListener('input', () => {
            imageFilters.saturation = parseInt(imgSaturationSlider.value, 10);
            if (imgSaturationVal) imgSaturationVal.textContent = `${imageFilters.saturation}%`;
            updateLivePreview();
        });
    }
    if (resetImgFilterBtn) {
        resetImgFilterBtn.addEventListener('click', () => {
            imageFilters.brightness = 100;
            imageFilters.contrast = 100;
            imageFilters.saturation = 100;
            if (imgBrightnessSlider) imgBrightnessSlider.value = 100;
            if (imgContrastSlider) imgContrastSlider.value = 100;
            if (imgSaturationSlider) imgSaturationSlider.value = 100;
            if (imgBrightnessVal) imgBrightnessVal.textContent = '100%';
            if (imgContrastVal) imgContrastVal.textContent = '100%';
            if (imgSaturationVal) imgSaturationVal.textContent = '100%';
            updateLivePreview();
            showToast('Đã đặt lại màu ảnh!');
        });
    }

    // Video Sliders (Separate!)
    if (vidBrightnessSlider) {
        vidBrightnessSlider.addEventListener('input', () => {
            videoFilters.brightness = parseInt(vidBrightnessSlider.value, 10);
            if (vidBrightnessVal) vidBrightnessVal.textContent = `${videoFilters.brightness}%`;
            applyVideoFilters();
        });
    }
    if (vidContrastSlider) {
        vidContrastSlider.addEventListener('input', () => {
            videoFilters.contrast = parseInt(vidContrastSlider.value, 10);
            if (vidContrastVal) vidContrastVal.textContent = `${videoFilters.contrast}%`;
            applyVideoFilters();
        });
    }
    if (vidSaturationSlider) {
        vidSaturationSlider.addEventListener('input', () => {
            videoFilters.saturation = parseInt(vidSaturationSlider.value, 10);
            if (vidSaturationVal) vidSaturationVal.textContent = `${videoFilters.saturation}%`;
            applyVideoFilters();
        });
    }
    if (resetVidFilterBtn) {
        resetVidFilterBtn.addEventListener('click', () => {
            videoFilters.brightness = 100;
            videoFilters.contrast = 100;
            videoFilters.saturation = 100;
            if (vidBrightnessSlider) vidBrightnessSlider.value = 100;
            if (vidContrastSlider) vidContrastSlider.value = 100;
            if (vidSaturationSlider) vidSaturationSlider.value = 100;
            if (vidBrightnessVal) vidBrightnessVal.textContent = '100%';
            if (vidContrastVal) vidContrastVal.textContent = '100%';
            if (vidSaturationVal) vidSaturationVal.textContent = '100%';
            applyVideoFilters();
            showToast('Đã đặt lại màu video!');
        });
    }

    // 8. Compression Slider (0% to 100%, video only, higher = more pixelated)
    if (compressionSlider) {
        compressionSlider.addEventListener('input', () => {
            compressionPercent = parseInt(compressionSlider.value, 10);
            updateCompressionUI();
        });
    }

    function updateCompressionUI() {
        if (!compressionPercentText || !compressionStatusBadge) return;
        const val = compressionPercent;

        if (val === 0) {
            compressionPercentText.textContent = '0% (Không nén - Siêu nét)';
            compressionStatusBadge.textContent = '0% - Chất lượng gốc';
            compressionStatusBadge.className = 'compression-badge';
        } else if (val <= 30) {
            compressionPercentText.textContent = `${val}% (Nén nhẹ - Chất lượng cao)`;
            compressionStatusBadge.textContent = `${val}% - Nén nhẹ`;
            compressionStatusBadge.className = 'compression-badge';
        } else if (val <= 60) {
            compressionPercentText.textContent = `${val}% (Nén vừa - Giảm dung lượng)`;
            compressionStatusBadge.textContent = `${val}% - Nén vừa`;
            compressionStatusBadge.className = 'compression-badge';
        } else if (val <= 85) {
            compressionPercentText.textContent = `${val}% (Nén cao - Bắt đầu vỡ nét)`;
            compressionStatusBadge.textContent = `${val}% - Bắt đầu vỡ nét`;
            compressionStatusBadge.className = 'compression-badge warning';
        } else {
            compressionPercentText.textContent = `${val}% (Nén tối đa - Vỡ nét cực mạnh)`;
            compressionStatusBadge.textContent = `${val}% - Vỡ nét tối đa`;
            compressionStatusBadge.className = 'compression-badge danger';
        }
    }

    // 9. Interactive Live Photo Preview (Touch / Mouse down to play video)
    let isStagePlaying = false;

    function playStageLive() {
        if (!loadedVideo || isStagePlaying) return;
        isStagePlaying = true;
        if (creatorStageFrame) creatorStageFrame.classList.add('playing');
        if (creatorLiveVideo) {
            creatorLiveVideo.currentTime = trimStart;
            creatorLiveVideo.play().catch(() => {});
        }
        if (creatorLiveStatusText) creatorLiveStatusText.textContent = 'Đang phát Live...';
        if (testLiveBtnText) testLiveBtnText.textContent = 'Dừng phát';
    }

    function stopStageLive() {
        if (!isStagePlaying) return;
        isStagePlaying = false;
        if (creatorStageFrame) creatorStageFrame.classList.remove('playing');
        if (creatorLiveVideo) creatorLiveVideo.pause();
        if (creatorLiveStatusText) creatorLiveStatusText.textContent = 'Nhấn giữ để phát';
        if (testLiveBtnText) testLiveBtnText.textContent = 'Phát thử Live';
    }

    if (creatorLiveVideo) {
        creatorLiveVideo.addEventListener('timeupdate', () => {
            if (isStagePlaying && creatorLiveVideo.currentTime >= trimEnd) {
                creatorLiveVideo.currentTime = trimStart;
                creatorLiveVideo.play().catch(() => {});
            }
        });
    }

    if (creatorStageFrame) {
        creatorStageFrame.addEventListener('mousedown', playStageLive);
        window.addEventListener('mouseup', stopStageLive);

        creatorStageFrame.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playStageLive();
        }, { passive: false });
        creatorStageFrame.addEventListener('touchend', stopStageLive);
        creatorStageFrame.addEventListener('touchcancel', stopStageLive);
    }

    if (testLiveBtn) {
        testLiveBtn.addEventListener('click', () => {
            if (isStagePlaying) stopStageLive();
            else playStageLive();
        });
    }

    // 10. Android Motion Photo Packager (Pure Client-side JavaScript)
    function buildAndroidMotionPhotoBytes(jpegUint8Array, videoUint8Array) {
        if (jpegUint8Array[0] !== 0xFF || jpegUint8Array[1] !== 0xD8) {
            throw new Error('Ảnh nguồn không đúng định dạng JPEG!');
        }

        const videoBytes = videoUint8Array;
        const vLen = videoBytes.length;

        // Samsung SEF trailer header before video (24 bytes):
        // marker (0x00, 0x00, 0x30, 0x0A) + length 16 (uint32 LE) + "MotionPhoto_Data" (16 bytes ASCII)
        const headerBefore = new Uint8Array(24);
        headerBefore[0] = 0x00; headerBefore[1] = 0x00; headerBefore[2] = 0x30; headerBefore[3] = 0x0A;
        new DataView(headerBefore.buffer).setUint32(4, 16, true);
        const mpDataStr = "MotionPhoto_Data";
        for (let i = 0; i < 16; i++) {
            headerBefore[8 + i] = mpDataStr.charCodeAt(i);
        }
        const videoOffsetPositive = 24;

        // Trailer after video (32 bytes):
        // "SEFH" (4) + 106 (4) + 1 (4) + marker (4) + negative_offset_from_sef (4) + data_length (4) + sef_data_size 24 (4) + "SEFT" (4)
        const trailerAfter = new Uint8Array(32);
        const sefhStr = "SEFH";
        for (let i = 0; i < 4; i++) trailerAfter[i] = sefhStr.charCodeAt(i);
        const viewAfter = new DataView(trailerAfter.buffer);
        viewAfter.setUint32(4, 106, true);
        viewAfter.setUint32(8, 1, true);
        trailerAfter[12] = 0x00; trailerAfter[13] = 0x00; trailerAfter[14] = 0x30; trailerAfter[15] = 0x0A;
        const negativeOffsetFromSef = 24 + vLen;
        const dataLength = vLen + 24;
        viewAfter.setUint32(16, negativeOffsetFromSef, true);
        viewAfter.setUint32(20, dataLength, true);
        const sefDataSize = 24;
        viewAfter.setUint32(24, sefDataSize, true);
        const seftStr = "SEFT";
        for (let i = 0; i < 4; i++) trailerAfter[28 + i] = seftStr.charCodeAt(i);

        // Combined trailer
        const trailerBytes = new Uint8Array(24 + vLen + 32);
        trailerBytes.set(headerBefore, 0);
        trailerBytes.set(videoBytes, 24);
        trailerBytes.set(trailerAfter, 24 + vLen);

        const videoOffsetNegative = trailerBytes.length - videoOffsetPositive; // vLen + 32

        // Google Camera XMP Metadata
        const xmpXml = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"
    xmlns:Container="http://ns.google.com/photos/1.0/container/"
    xmlns:Item="http://ns.google.com/photos/1.0/container/item/"
   GCamera:MotionPhoto="1"
   GCamera:MotionPhotoVersion="1"
   GCamera:MotionPhotoPresentationTimestampUs="0"
   GCamera:MicroVideo="1"
   GCamera:MicroVideoVersion="1"
   GCamera:MicroVideoOffset="${videoOffsetNegative}"
   GCamera:MicroVideoPresentationTimestampUs="0">
   <Container:Directory>
    <rdf:Seq>
     <rdf:li rdf:parseType="Resource">
      <Item:Mime>image/jpeg</Item:Mime>
      <Item:Semantic>Primary</Item:Semantic>
      <Item:Length>0</Item:Length>
      <Item:Padding>0</Item:Padding>
     </rdf:li>
     <rdf:li rdf:parseType="Resource">
      <Item:Mime>video/mp4</Item:Mime>
      <Item:Semantic>MotionPhoto</Item:Semantic>
      <Item:Length>${videoOffsetNegative}</Item:Length>
      <Item:Padding>0</Item:Padding>
     </rdf:li>
    </rdf:Seq>
   </Container:Directory>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

        const encoder = new TextEncoder();
        const xmpBytes = encoder.encode(xmpXml);
        const namespaceStr = "http://ns.adobe.com/xap/1.0/\0";
        const nsBytes = encoder.encode(namespaceStr);

        const payloadLen = nsBytes.length + xmpBytes.length;
        const segLength = 2 + payloadLen;
        const app1Segment = new Uint8Array(4 + payloadLen);
        app1Segment[0] = 0xFF;
        app1Segment[1] = 0xE1;
        app1Segment[2] = (segLength >> 8) & 0xFF;
        app1Segment[3] = segLength & 0xFF;
        app1Segment.set(nsBytes, 4);
        app1Segment.set(xmpBytes, 4 + nsBytes.length);

        let insertIdx = 2;
        if (jpegUint8Array[2] === 0xFF && jpegUint8Array[3] === 0xE0) {
            const app0Len = (jpegUint8Array[4] << 8) | jpegUint8Array[5];
            insertIdx = 4 + app0Len;
        }

        const totalLen = jpegUint8Array.length + app1Segment.length + trailerBytes.length;
        const result = new Uint8Array(totalLen);
        result.set(jpegUint8Array.subarray(0, insertIdx), 0);
        result.set(app1Segment, insertIdx);
        result.set(jpegUint8Array.subarray(insertIdx), insertIdx + app1Segment.length);
        result.set(trailerBytes, jpegUint8Array.length + app1Segment.length);

        return result;
    }

    // 11. Video Processing & Compression Engine
    async function processAndCompressVideo(onProgress) {
        const dims = getCroppedVideoDimensions();
        const sw = dims.w;
        const sh = dims.h;
        const sx = Math.round(loadedVideo.width * cropBoxNorm.x);
        const sy = Math.round(loadedVideo.height * cropBoxNorm.y);

        // Compression factor:
        // C = 0: scale = 1.0 (crisp, full crop resolution)
        // C = 100: scale = 0.16 (drastically downscaled to ~160px width, pixelated / broken)
        const scale = Math.max(0.16, 1.0 - (compressionPercent / 100) * 0.84);
        const outW = Math.max(96, Math.floor((sw * scale) / 2) * 2);
        const outH = Math.max(96, Math.floor((sh * scale) / 2) * 2);

        // Bitrate factor:
        // C = 0: 6.5 Mbps
        // C = 50: 1.6 Mbps
        // C = 80: 250 kbps
        // C = 100: 32 kbps (extreme macroblocking / pixelation!)
        const targetBitrate = Math.max(32000, Math.round(6500000 * Math.pow(1 - (compressionPercent / 100) * 0.98, 2)));

        // Check if trimmed
        const totalVidDur = loadedVideo.duration || 3.0;
        const isTrimmed = (trimStart > 0.05) || ((totalVidDur - trimEnd) > 0.1);

        // If no crop, no filters, 0% compression, and no trim: return original video bytes directly
        const isCropped = cropBoxNorm.x > 0.005 || cropBoxNorm.y > 0.005 || cropBoxNorm.w < 0.99 || cropBoxNorm.h < 0.99;
        const hasFilters = videoFilters.brightness !== 100 || videoFilters.contrast !== 100 || videoFilters.saturation !== 100;
        const isCompressed = compressionPercent > 0;

        if (!isCropped && !hasFilters && !isCompressed && !isTrimmed) {
            onProgress(70, 'Sử dụng video gốc không nén...');
            const buffer = await loadedVideo.file.arrayBuffer();
            return new Uint8Array(buffer);
        }

        const trimDuration = Math.max(0.2, trimEnd - trimStart);
        onProgress(35, `Đang xử lý video (${outW}x${outH}, thời lượng ${trimDuration.toFixed(1)}s)...`);

        // Offscreen recording canvas
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');

        // Low quality nearest-neighbor pixelation for high compression levels
        if (compressionPercent >= 50) {
            ctx.imageSmoothingEnabled = false;
        } else {
            ctx.imageSmoothingEnabled = true;
        }

        const filterStr = `brightness(${videoFilters.brightness}%) contrast(${videoFilters.contrast}%) saturate(${videoFilters.saturation}%)`;
        ctx.filter = filterStr;

        // Offscreen video player
        const offVideo = document.createElement('video');
        offVideo.preload = 'auto';
        offVideo.src = loadedVideo.blobUrl;
        offVideo.muted = false;

        await new Promise((resolve) => {
            if (offVideo.readyState >= 2) resolve();
            else offVideo.onloadeddata = resolve;
        });

        // Seek offVideo to trimStart
        offVideo.currentTime = trimStart;
        await new Promise((resolve) => {
            const onSeeked = () => {
                offVideo.removeEventListener('seeked', onSeeked);
                resolve();
            };
            offVideo.addEventListener('seeked', onSeeked);
            setTimeout(resolve, 350);
        });

        // Determine supported recorder mimeType (prefer MP4)
        const mimeTypes = [
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm'
        ];
        let chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/mp4';

        const stream = canvas.captureStream(30);

        // Include audio track if possible
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const actx = new AudioCtx();
                const src = actx.createMediaElementSource(offVideo);
                const dest = actx.createMediaStreamDestination();
                src.connect(dest);
                const audioTrack = dest.stream.getAudioTracks()[0];
                if (audioTrack) stream.addTrack(audioTrack);
            }
        } catch (e) {
            // Audio capture may be restricted or silent, continue without error
        }

        const recorder = new MediaRecorder(stream, {
            mimeType: chosenMime,
            videoBitsPerSecond: targetBitrate
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        return new Promise((resolve, reject) => {
            let finished = false;
            let animId = null;

            function finishRecording() {
                if (finished) return;
                finished = true;
                if (animId) cancelAnimationFrame(animId);
                offVideo.pause();
                setTimeout(() => {
                    try { recorder.stop(); } catch (e) {}
                }, 150);
            }

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: chosenMime });
                const buf = await blob.arrayBuffer();
                resolve(new Uint8Array(buf));
            };

            recorder.onerror = (err) => reject(err);

            recorder.start(100);

            function drawFrame() {
                if (finished || offVideo.paused || offVideo.ended || offVideo.currentTime >= trimEnd) {
                    if (!finished && (offVideo.ended || offVideo.currentTime >= trimEnd)) {
                        finishRecording();
                    }
                    return;
                }

                ctx.filter = filterStr;
                if (compressionPercent >= 50) {
                    ctx.imageSmoothingEnabled = false;
                }
                ctx.drawImage(offVideo, sx, sy, sw, sh, 0, 0, outW, outH);

                const elapsed = Math.max(0, offVideo.currentTime - trimStart);
                const pct = Math.min(75, 35 + (elapsed / trimDuration) * 40);
                onProgress(pct, `Đang mã hóa video (${Math.round((elapsed / trimDuration) * 100)}%)...`);

                animId = requestAnimationFrame(drawFrame);
            }

            offVideo.ontimeupdate = () => {
                if (offVideo.currentTime >= trimEnd) {
                    finishRecording();
                }
            };

            offVideo.onended = () => {
                finishRecording();
            };

            offVideo.play().then(() => {
                animId = requestAnimationFrame(drawFrame);
            }).catch(reject);
        });
    }

    // 12. Main Export Trigger
    if (exportAndroidBtn) {
        exportAndroidBtn.addEventListener('click', async () => {
            if (!loadedImage || !loadedVideo) {
                showToast('Vui lòng chọn cả ảnh bìa và video!');
                return;
            }

            // Export is strictly for Android
            exportAndroidBtn.disabled = true;
            if (exportLoader) exportLoader.style.display = 'block';
            if (exportProgressBox) exportProgressBox.style.display = 'flex';

            function updateProgress(pct, msg) {
                if (exportProgressFill) exportProgressFill.style.width = `${pct}%`;
                if (exportProgressMsg) exportProgressMsg.textContent = msg;
            }

            try {
                updateProgress(10, 'Đang chuẩn bị ảnh & video...');

                // Step 1: Render still image matching video aspect ratio (100% quality, unaffected by video compression!)
                const dims = getCroppedVideoDimensions();
                const targetRatio = dims.ratio;
                const imgW = loadedImage.width;
                const imgH = loadedImage.height;
                const imgRatio = imgW / imgH;

                let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
                if (imgRatio > targetRatio) {
                    srcW = Math.round(imgH * targetRatio);
                    srcX = Math.round((imgW - srcW) / 2);
                } else {
                    srcH = Math.round(imgW / targetRatio);
                    srcY = Math.round((imgH - srcH) / 2);
                }

                const imgCanvas = document.createElement('canvas');
                imgCanvas.width = srcW;
                imgCanvas.height = srcH;
                const imgCtx = imgCanvas.getContext('2d');
                // Apply Image filters ONLY
                imgCtx.filter = `brightness(${imageFilters.brightness}%) contrast(${imageFilters.contrast}%) saturate(${imageFilters.saturation}%)`;
                imgCtx.drawImage(loadedImage.element, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

                updateProgress(25, 'Đang xuất ảnh tĩnh chất lượng cao...');
                const imageBlob = await new Promise(r => imgCanvas.toBlob(r, 'image/jpeg', 0.98));
                const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());

                // Step 2: Render & Compress Video
                const videoBytes = await processAndCompressVideo(updateProgress);

                // Step 3: Combine into Android Motion Photo
                updateProgress(85, 'Đang nhúng XMP & Samsung Motion Photo...');
                const motionPhotoBytes = buildAndroidMotionPhotoBytes(imageBytes, videoBytes);

                // Step 4: Download
                updateProgress(100, 'Hoàn tất! Đang tải về...');

                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                const filename = `MVIMG_${ts}.jpg`;

                const finalBlob = new Blob([motionPhotoBytes], { type: 'image/jpeg' });
                const downloadUrl = URL.createObjectURL(finalBlob);
                triggerBrowserDownload(downloadUrl, filename);
                URL.revokeObjectURL(downloadUrl);

                showToast('Đã xuất Live Photo Android (.JPG) thành công!', 3500);

                setTimeout(() => {
                    if (exportProgressBox) exportProgressBox.style.display = 'none';
                    if (exportProgressFill) exportProgressFill.style.width = '0%';
                }, 2500);
            } catch (err) {
                console.error(err);
                showToast(`Lỗi khi tạo Live Photo: ${err.message}`, 4000);
            } finally {
                exportAndroidBtn.disabled = false;
                if (exportLoader) exportLoader.style.display = 'none';
            }
        });
    }
})();
