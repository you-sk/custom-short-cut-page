const shortcutGrid = document.getElementById('shortcutGrid');
// 追加モーダル関連
const addShortcutModal = document.getElementById('addShortcutModal');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const addShortcutForm = document.getElementById('addShortcutForm');
const addSiteNameInput = document.getElementById('addSiteName');
const addSiteUrlInput = document.getElementById('addSiteUrl');
const addFormErrorMessageContainer = document.getElementById('addFormErrorMessageContainer');

// 編集モーダル関連
const editShortcutModal = document.getElementById('editShortcutModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editShortcutForm = document.getElementById('editShortcutForm');
const editShortcutIndexInput = document.getElementById('editShortcutIndex');
const editSiteNameInput = document.getElementById('editSiteName');
const editSiteUrlInput = document.getElementById('editSiteUrl');
const editFormErrorMessageContainer = document.getElementById('editFormErrorMessageContainer');

// その他
const exportBtn = document.getElementById('exportBtn');
const importBtnTrigger = document.getElementById('importBtnTrigger');
const importFileElement = document.getElementById('importFile');
const toastElement = document.getElementById('toast');

document.getElementById('currentYear').textContent = new Date().getFullYear();
let draggedItem = null;

function showToast(message, duration = 3000) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, duration);
}

// --- 追加モーダル処理 ---
openAddModalBtn.onclick = () => {
    addShortcutModal.style.display = "block";
    addFormErrorMessageContainer.innerHTML = '';
};
closeAddModalBtn.onclick = () => {
    addShortcutModal.style.display = "none";
    addShortcutForm.reset();
};

// --- 編集モーダル処理 ---
function openEditModal(index) {
    const shortcuts = getShortcuts();
    const shortcut = shortcuts[index];
    if (shortcut) {
        editShortcutIndexInput.value = index;
        editSiteNameInput.value = shortcut.name;
        editSiteUrlInput.value = shortcut.url;
        editShortcutModal.style.display = "block";
        editFormErrorMessageContainer.innerHTML = '';
    }
}
closeEditModalBtn.onclick = () => {
    editShortcutModal.style.display = "none";
    editShortcutForm.reset();
};

// モーダル外クリックで閉じないように変更
// window.onclick のイベントリスナーをコメントアウトまたは削除
/*
window.onclick = (event) => {
    if (event.target == addShortcutModal) {
        addShortcutModal.style.display = "none";
        addShortcutForm.reset();
    }
    if (event.target == editShortcutModal) {
        editShortcutModal.style.display = "none";
        editShortcutForm.reset();
    }
};
*/

function getShortcuts() {
    try {
        const shortcuts = JSON.parse(localStorage.getItem('shortcuts'));
        return Array.isArray(shortcuts) ? shortcuts : [];
    } catch (e) {
        console.error("Error getting shortcuts from localStorage:", e);
        return [];
    }
}

function saveShortcuts(shortcuts) {
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
}

function getFaviconUrls(domain) {
    return [
        `https://${domain}/favicon.ico`,
        `https://${domain}/apple-touch-icon.png`,
        `https://${domain}/apple-touch-icon-precomposed.png`,
        `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
    ];
}

function createFaviconElement(shortcut) {
    const container = document.createElement('div');
    container.className = "flex justify-center items-center w-full mb-2 sm:mb-3";

    // プレースホルダーを作成
    const initial = shortcut.name.charAt(0).toUpperCase();
    const bgColor = getBackgroundColor(shortcut.name);
    const placeholder = document.createElement('div');
    placeholder.className = `icon-placeholder-display w-8 h-8 sm:w-10 sm:h-10 text-lg sm:text-xl ${bgColor}`;
    placeholder.textContent = initial;
    
    // プレースホルダーを表示
    container.appendChild(placeholder);

    // フラグを追加して、ファビコンが正常に読み込まれたかを追跡
    let faviconLoaded = false;

    try {
        const domainUrl = new URL(shortcut.url);
        const faviconUrls = getFaviconUrls(domainUrl.hostname);
        
        const tryFavicon = async (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                let timeout = setTimeout(() => {
                    reject(new Error('Timeout'));
                }, 5000); // 5秒タイムアウト

                img.onload = () => {
                    clearTimeout(timeout);
                    if (img.width > 1 && img.height > 1 && !url.includes('404')) {
                        resolve(url);
                    } else {
                        reject(new Error('Invalid favicon'));
                    }
                };
                
                img.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load'));
                };

                img.src = url;
            });
        };

        // すべてのURLを順番に試す
        const tryAllFavicons = async () => {
            for (const url of faviconUrls) {
                try {
                    const validUrl = await tryFavicon(url);
                    if (!faviconLoaded) { // 既に成功していない場合のみ
                        const faviconDiv = document.createElement('div');
                        faviconDiv.className = "w-8 h-8 sm:w-10 sm:h-10 bg-contain bg-center bg-no-repeat";
                        faviconDiv.style.backgroundImage = `url('${validUrl}')`;
                        
                        faviconLoaded = true;
                        container.innerHTML = '';
                        container.appendChild(faviconDiv);
                        // todo gstaticからの取得の場合、画像のurlをフェッチして(リダイレクト先)をとってみる



                        return true;
                    }
                } catch (e) {
                    continue;
                }
            }
            return false;
        };

        // 非同期でファビコン取得を試みる
        tryAllFavicons().then(success => {
            if (!success && !faviconLoaded) {
                // すべての試行が失敗し、かつファビコンが読み込まれていない場合
                container.innerHTML = '';
                container.appendChild(placeholder.cloneNode(true));
            }
        }).catch(() => {
            if (!faviconLoaded) {
                // エラーが発生し、かつファビコンが読み込まれていない場合
                container.innerHTML = '';
                container.appendChild(placeholder.cloneNode(true));
            }
        });

    } catch (e) {
        console.warn("Invalid URL:", shortcut.url);
    }

    return container;
}

function renderShortcuts() {
    shortcutGrid.innerHTML = '';
    const shortcuts = getShortcuts();
    shortcuts.forEach((shortcut, index) => {
        const card = document.createElement('a');
        card.href = shortcut.url;
        card.target = "_blank";
        card.className = "shortcut-card relative bg-white p-4 rounded-xl shadow-md flex flex-col items-center justify-center text-center";
        card.setAttribute('data-index', index);
        card.draggable = true;

        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragleave', handleDragLeave);

        // ファビコン要素の作成と追加
        const iconContainer = createFaviconElement(shortcut);
        card.appendChild(iconContainer);

        const nameElement = document.createElement('p');
        nameElement.className = "text-gray-700 font-semibold text-xs sm:text-sm break-all";
        nameElement.textContent = shortcut.name;
        card.appendChild(nameElement);

        const actionBtnContainer = document.createElement('div');
        actionBtnContainer.className = 'action-btn-container';

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt text-xs"></i>';
        editBtn.title = "編集";
        editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openEditModal(index);
        };
        actionBtnContainer.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
        deleteBtn.title = "削除";
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`「${shortcut.name}」を削除してもよろしいですか？`)) {
                deleteShortcut(index);
            }
        };
        actionBtnContainer.appendChild(deleteBtn);
        card.appendChild(actionBtnContainer);
        shortcutGrid.appendChild(card);
    });
}

function getBackgroundColor(name) {
    const colors = [
        'bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400', 
        'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-teal-400',
        'bg-orange-400'
    ];
    let hash = 0;
    if (name) {
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

function displayFormError(container, message) {
    container.innerHTML = `<p class="text-red-500 text-xs italic">${message}</p>`;
}

addShortcutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addFormErrorMessageContainer.innerHTML = '';
    const name = addSiteNameInput.value.trim();
    let url = addSiteUrlInput.value.trim();

    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        new URL(url);
    } catch (_) {
        displayFormError(addFormErrorMessageContainer, '有効なURLを入力してください。 (例: https://www.google.com)');
        return;
    }

    if (name && url) {
        const shortcuts = getShortcuts();
        if (shortcuts.some(s => s.url === url)) {
            displayFormError(addFormErrorMessageContainer, 'このURLは既に追加されています。');
            return; 
        }
        shortcuts.push({ name, url });
        saveShortcuts(shortcuts);
        renderShortcuts();
        addShortcutForm.reset();
        addShortcutModal.style.display = "none";
        showToast(`「${name}」を追加しました。`);
    }
});

editShortcutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    editFormErrorMessageContainer.innerHTML = '';
    const index = parseInt(editShortcutIndexInput.value);
    const name = editSiteNameInput.value.trim();
    let url = editSiteUrlInput.value.trim();

    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        new URL(url);
    } catch (_) {
        displayFormError(editFormErrorMessageContainer, '有効なURLを入力してください。 (例: https://www.google.com)');
        return;
    }

    if (name && url && !isNaN(index)) {
        const shortcuts = getShortcuts();
        if (shortcuts.some((s, i) => s.url === url && i !== index)) {
             displayFormError(editFormErrorMessageContainer, 'このURLは他のショートカットで既に使用されています。');
            return;
        }
        shortcuts[index] = { name, url };
        saveShortcuts(shortcuts);
        renderShortcuts();
        editShortcutForm.reset();
        editShortcutModal.style.display = "none";
        showToast(`「${name}」を更新しました。`);
    }
});

function deleteShortcut(index) {
    let shortcuts = getShortcuts();
    const deletedShortcutName = shortcuts[index].name;
    shortcuts.splice(index, 1);
    saveShortcuts(shortcuts);
    renderShortcuts();
    showToast(`「${deletedShortcutName}」を削除しました。`);
}

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (this !== draggedItem) {
         this.classList.add('drag-over');
    }
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over');
    if (draggedItem !== this) {
        const shortcuts = getShortcuts();
        const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
        const toIndex = parseInt(this.getAttribute('data-index'));

        const itemToMove = shortcuts.splice(fromIndex, 1)[0];
        shortcuts.splice(toIndex, 0, itemToMove);
        
        saveShortcuts(shortcuts);
        renderShortcuts();
        showToast('ショートカットを並び替えました。');
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.shortcut-card.drag-over').forEach(card => {
        card.classList.remove('drag-over');
    });
}

exportBtn.addEventListener('click', () => {
    const shortcuts = getShortcuts();
    if (shortcuts.length === 0) {
        showToast('エクスポートするショートカットがありません。');
        return;
    }
    const dataStr = JSON.stringify(shortcuts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'shortcuts_export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
    showToast('ショートカットをエクスポートしました。');
});

importBtnTrigger.addEventListener('click', () => {
    importFileElement.click();
});

importFileElement.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedShortcuts = JSON.parse(e.target.result);
                if (Array.isArray(importedShortcuts) && importedShortcuts.every(item => typeof item.name === 'string' && typeof item.url === 'string')) {
                    if (confirm('現在のショートカットをインポートした内容で置き換えますか？（現在の設定は失われます）')) {
                        saveShortcuts(importedShortcuts);
                        renderShortcuts();
                        showToast('ショートカットをインポートしました。');
                    }
                } else {
                    showToast('無効なファイル形式です。正しいJSONファイルを選択してください。');
                }
            } catch (error) {
                showToast('ファイルの読み込みに失敗しました。JSON形式であることを確認してください。');
                console.error("Import error:", error);
            } finally {
                importFileElement.value = '';
            }
        };
        reader.readAsText(file);
    }
});

renderShortcuts();