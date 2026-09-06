let currentData = null;
let currentIndex = 0;
let selectedIndices = new Set();
let currentPlatform = 'ios';

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
            handleParse();
        }
    } catch (e) {
        showToast('Hãy dán link vào ô tìm kiếm!');
    }
});

urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleParse();
    }
});

submitBtn.addEventListener('click', handleParse);

document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPlatform = btn.dataset.platform;
        updatePlatformLabels();
        showToast(`Chế độ: ${currentPlatform === 'ios' ? 'Apple (iOS)' : 'Android'}`);
    });
});

function updatePlatformLabels() {
    if (currentPlatform === 'ios') {
        quickDownloadText.textContent = 'Tải ảnh này về (iOS)';
        mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (iOS)';
    } else {
        quickDownloadText.textContent = 'Tải ảnh này về (Android)';
        mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (Android)';
    }
}

async function handleParse() {
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
        showToast('Vui lòng dán link TikTok!');
        urlInput.focus();
        return;
    }

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
    filterNotice.textContent = `${currentData.total_live} Live Photo`;

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
    currentData.items.forEach((item, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumb-item ${idx === 0 ? 'active' : ''} ${selectedIndices.has(item.index) ? 'checked' : ''}`;
        thumb.dataset.slideIndex = idx;

        const img = document.createElement('img');
        img.src = `/api/proxy?url=${encodeURIComponent(item.image_url)}`;
        img.loading = 'lazy';

        const tick = document.createElement('div');
        tick.className = 'thumb-tick-badge';
        tick.textContent = '✔';

        const num = document.createElement('div');
        num.className = 'thumb-num';
        num.textContent = `${idx + 1}`;

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
    showcaseImage.src = `/api/proxy?url=${encodeURIComponent(item.image_url)}`;
    showcaseVideo.src = `/api/proxy?url=${encodeURIComponent(item.video_url)}`;

    hudCounter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(currentData.items.length).padStart(2, '0')}`;

    const isChecked = selectedIndices.has(item.index);
    hudCheckBtn.classList.toggle('active', isChecked);

    document.querySelectorAll('.thumb-item').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentIndex);
    });

    const activeThumb = thumbnailStrip.children[currentIndex];
    if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
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
    if (e.target.closest('.hud-check-btn') || e.target.closest('.nav-arrow')) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

showcaseFrame.addEventListener('touchend', (e) => {
    if (e.target.closest('.hud-check-btn') || e.target.closest('.nav-arrow')) return;
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
        if (isLivePlaying) {
            stopLiveVideo();
        } else {
            playLiveVideo();
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
    if (e.target.closest('.hud-check-btn') || e.target.closest('.nav-arrow')) return;
    playLiveVideo();
});

window.addEventListener('mouseup', () => {
    if (isTouchDevice) return;
    stopLiveVideo();
});

function updateDockSelectionUI() {
    const total = currentData ? currentData.items.length : 0;
    const selectedCount = selectedIndices.size;
    dockSelectedCount.textContent = `${selectedCount} / ${total} ảnh`;

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

function downloadSingleItem(item, orderNumber) {
    const pad = String(orderNumber).padStart(2, '0');
    if (currentPlatform === 'android') {
        showToast(`Đang tải ảnh #${orderNumber}...`);
        const url = `/api/download/android-file?img_url=${encodeURIComponent(item.image_url)}&vid_url=${encodeURIComponent(item.video_url)}&filename=LivePhoto_${pad}.jpg`;
        triggerBrowserDownload(url, `LivePhoto_${pad}.jpg`);
    } else {
        showToast(`Đang tải Live Photo iOS #${orderNumber}...`);
        const assetUUID = generateUUID();
        const imgUrl = `/api/download/ios-jpg?img_url=${encodeURIComponent(item.image_url)}&uuid_str=${assetUUID}&filename=IMG_${pad}.JPG`;
        const movUrl = `/api/download/ios-mov?vid_url=${encodeURIComponent(item.video_url)}&uuid_str=${assetUUID}&filename=IMG_${pad}.MOV`;
        
        triggerBrowserDownload(imgUrl, `IMG_${pad}.JPG`);
        setTimeout(() => {
            triggerBrowserDownload(movUrl, `IMG_${pad}.MOV`);
        }, 500);
    }
}

downloadCurrentBtn.addEventListener('click', () => {
    if (!currentData || !currentData.items.length) return;
    const item = currentData.items[currentIndex];
    downloadSingleItem(item, currentIndex + 1);
});

downloadSelectedBtn.addEventListener('click', () => {
    if (!currentData || selectedIndices.size === 0) {
        showToast('Chưa chọn ảnh nào!');
        return;
    }

    const selectedItems = currentData.items.filter(i => selectedIndices.has(i.index));
    showToast(`Bắt đầu tải ${selectedItems.length} ảnh...`);

    let delay = 0;
    selectedItems.forEach(item => {
        setTimeout(() => {
            downloadSingleItem(item, item.display_index);
        }, delay);
        delay += currentPlatform === 'ios' ? 1200 : 700;
    });
});

downloadZipBtn.addEventListener('click', async () => {
    if (!currentData) return;
    const indices = Array.from(selectedIndices);
    if (indices.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 ảnh!');
        return;
    }

    showToast('Đang tạo file ZIP...');
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
        const filename = `TikTok_LivePhoto_${currentPlatform.toUpperCase()}_${currentData.id}.zip`;
        triggerBrowserDownload(downloadUrl, filename);
        window.URL.revokeObjectURL(downloadUrl);
        showToast('Đã tải xong file ZIP!');
    } catch (e) {
        showToast(e.message);
    }
});
