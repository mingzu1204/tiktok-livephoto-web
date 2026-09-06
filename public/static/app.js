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
        if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải ảnh đã chọn (iOS)';
    } else {
        quickDownloadText.textContent = 'Tải ảnh này về (Android)';
        mainDownloadBtnText.textContent = 'Tải ảnh đã chọn (Android)';
        if (desktopDownloadSelectedText) desktopDownloadSelectedText.textContent = 'Tải ảnh đã chọn (Android)';
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
    filterNotice.textContent = currentData.is_story ? '1 Nhật ký (Story)' : `${currentData.total_live} Live Photo`;

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

    if (desktopSelectedCount) {
        desktopSelectedCount.textContent = `${selectedCount} / ${total} ảnh`;
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

const secretStatsModal = document.getElementById('secretStatsModal');
const closeSecretStatsModalBtn = document.getElementById('closeSecretStatsModalBtn');
const refreshSecretStatsBtn = document.getElementById('refreshSecretStatsBtn');
const statTotalParses = document.getElementById('statTotalParses');
const statTotalDownloads = document.getElementById('statTotalDownloads');
const statIosJpg = document.getElementById('statIosJpg');
const statIosMov = document.getElementById('statIosMov');
const statAndroid = document.getElementById('statAndroid');
const statZip = document.getElementById('statZip');
const secretHistoryCount = document.getElementById('secretHistoryCount');
const secretHistoryTableBody = document.getElementById('secretHistoryTableBody');

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
    if (currentPlatform === 'android') {
        showToast(`Đang tải ảnh #${orderNumber}...`);
        const url = `/api/download/android-file?img_url=${encodeURIComponent(item.image_url)}&vid_url=${encodeURIComponent(item.video_url)}&filename=LivePhoto_${pad}.jpg`;
        triggerBrowserDownload(url, `LivePhoto_${pad}.jpg`);
    } else {
        openIosDownloadModal(item, orderNumber);
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
        showToast('Chưa chọn ảnh nào!');
        return;
    }

    const selectedItems = currentData.items.filter(i => selectedIndices.has(i.index));
    if (currentPlatform === 'ios') {
        if (selectedItems.length === 1) {
            openIosDownloadModal(selectedItems[0], selectedItems[0].display_index);
            return;
        } else {
            downloadZipBtn.click();
            showToast('Trên iOS, đã tự động nén ZIP để Safari không chặn tải nhiều file!', 3200);
            return;
        }
    }

    showToast(`Bắt đầu tải ${selectedItems.length} ảnh...`);
    let delay = 0;
    selectedItems.forEach(item => {
        setTimeout(() => {
            downloadSingleItem(item, item.display_index);
        }, delay);
        delay += 700;
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
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        if (target === 'ios') {
            if (tabContentIos) tabContentIos.style.display = 'flex';
            if (tabContentAndroid) tabContentAndroid.style.display = 'none';
        } else {
            if (tabContentIos) tabContentIos.style.display = 'none';
            if (tabContentAndroid) tabContentAndroid.style.display = 'flex';
        }
    });
});

async function loadAndShowSecretStats() {
    try {
        const resp = await fetch('/api/secret-stats');
        if (!resp.ok) throw new Error('Không thể tải thống kê');
        const data = await resp.json();

        if (statTotalParses) statTotalParses.textContent = data.total_parses || 0;
        if (statTotalDownloads) statTotalDownloads.textContent = data.total_downloads || 0;
        if (statIosJpg) statIosJpg.textContent = data.downloads_ios_jpg || 0;
        if (statIosMov) statIosMov.textContent = data.downloads_ios_mov || 0;
        if (statAndroid) statAndroid.textContent = data.downloads_android || 0;
        if (statZip) statZip.textContent = data.downloads_zip || 0;

        const links = data.recent_links || [];
        if (secretHistoryCount) secretHistoryCount.textContent = `${links.length} link`;

        if (secretHistoryTableBody) {
            if (!links.length) {
                secretHistoryTableBody.innerHTML = '<tr><td colspan="4" class="empty-table-cell">Chưa có lượt dán link nào</td></tr>';
            } else {
                secretHistoryTableBody.innerHTML = links.map(item => `
                    <tr>
                        <td>${escapeHtml(item.time)}</td>
                        <td class="table-author-cell">
                            ${escapeHtml(item.nickname || 'Ẩn danh')}
                            <small>@${escapeHtml(item.author || 'tiktok')}</small>
                        </td>
                        <td><strong>${item.count || 0}</strong></td>
                        <td>
                            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="table-url-link" title="${escapeHtml(item.url)}">
                                ${escapeHtml(item.url)}
                            </a>
                        </td>
                    </tr>
                `).join('');
            }
        }

        if (secretStatsModal) secretStatsModal.style.display = 'flex';
    } catch (err) {
        showToast('Lỗi khi tải thông tin mật: ' + err.message);
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
            loadAndShowSecretStats();
        }
    });
}

if (closeSecretStatsModalBtn && secretStatsModal) {
    closeSecretStatsModalBtn.addEventListener('click', () => {
        secretStatsModal.style.display = 'none';
    });
}

if (refreshSecretStatsBtn) {
    refreshSecretStatsBtn.addEventListener('click', () => {
        loadAndShowSecretStats();
        showToast('Đã làm mới dữ liệu!');
    });
}

if (secretStatsModal) {
    secretStatsModal.addEventListener('click', (e) => {
        if (e.target === secretStatsModal) {
            secretStatsModal.style.display = 'none';
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (helpModal && helpModal.style.display !== 'none') helpModal.style.display = 'none';
        if (iosDownloadModal && iosDownloadModal.style.display !== 'none') iosDownloadModal.style.display = 'none';
        if (secretStatsModal && secretStatsModal.style.display !== 'none') secretStatsModal.style.display = 'none';
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        loadAndShowSecretStats();
    }
});
