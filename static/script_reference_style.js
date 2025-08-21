let allTherapists = [];
let filteredTherapists = [];
let currentPage = 1;
const itemsPerPage = 20;

// DOM要素の取得
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    areaSelect: document.getElementById('areaSelect'),
    ageSelect: document.getElementById('ageSelect'),
    cupSizeSelect: document.getElementById('cupSizeSelect'),
    playContentSelect: document.getElementById('playContentSelect'),
    appearanceSelect: document.getElementById('appearanceSelect'),
    favoritesOnly: document.getElementById('favoritesOnly'),
    therapistGrid: document.getElementById('therapistGrid'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    noResults: document.getElementById('noResults'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    therapistDetailModal: document.getElementById('therapistDetailModal'),
    closeDetailModal: document.getElementById('closeDetailModal'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    shopUrlBtn: document.getElementById('shopUrlBtn')
};

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('参考サイトUIUX再現版アプリケーションを初期化中...');
    
    initializeApp();
});

async function initializeApp() {
    try {
        // イベントリスナーの設定
        setupEventListeners();
        
        // フィルターオプションの読み込み
        await loadFilterOptions();
        
        // セラピストデータの読み込み
        await loadTherapists();
        
        console.log('アプリケーションが初期化されました（参考サイトUIUX再現版）');
    } catch (error) {
        console.error('アプリケーション初期化エラー:', error);
        showError('アプリケーションの初期化に失敗しました。');
    }
}

function setupEventListeners() {
    // 検索機能
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // 検索バーのリセット機能を追加
    elements.searchInput.addEventListener('input', function(e) {
        const keyword = e.target.value.trim();
        if (keyword === '') {
            // 検索ワードが空の場合、全件表示に戻す
            filteredTherapists = [...allTherapists];
            applyFilters();
        }
    });
    
    // フィルター変更
    elements.areaSelect.addEventListener('change', applyFilters);
    elements.ageSelect.addEventListener('change', applyFilters);
    elements.cupSizeSelect.addEventListener('change', applyFilters);
    elements.playContentSelect.addEventListener('change', applyFilters);
    elements.appearanceSelect.addEventListener('change', applyFilters);
    elements.favoritesOnly.addEventListener('change', applyFilters);
    
    // ヘッダーボタン
    elements.favoritesBtn.addEventListener('click', showFavorites);
    
    // モーダル
    elements.closeDetailModal.addEventListener('click', closeModal);
    elements.therapistDetailModal.addEventListener('click', function(e) {
        if (e.target === elements.therapistDetailModal) {
            closeModal();
        }
    });
    
    // お気に入りボタン
    elements.favoriteBtn.addEventListener('click', toggleFavorite);
    
    // 店舗URLボタン
    elements.shopUrlBtn.addEventListener('click', openShopUrl);
}

async function loadFilterOptions() {
    try {
        const response = await fetch('/api/filter-options');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // エリアオプション
        if (data.areas && Array.isArray(data.areas)) {
            data.areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                elements.areaSelect.appendChild(option);
            });
        }
        
        // 年齢オプション
        if (data.age_groups && Array.isArray(data.age_groups)) {
            data.age_groups.forEach(ageGroup => {
                const option = document.createElement('option');
                option.value = ageGroup;
                option.textContent = ageGroup;
                elements.ageSelect.appendChild(option);
            });
        }
        
        // カップサイズオプション
        if (data.cup_sizes && Array.isArray(data.cup_sizes)) {
            data.cup_sizes.forEach(cupSize => {
                const option = document.createElement('option');
                option.value = cupSize;
                option.textContent = cupSize;
                elements.cupSizeSelect.appendChild(option);
            });
        }
        
        // プレイ内容オプション
        if (data.play_contents && Array.isArray(data.play_contents)) {
            data.play_contents.forEach(playContent => {
                const option = document.createElement('option');
                option.value = playContent;
                option.textContent = playContent;
                elements.playContentSelect.appendChild(option);
            });
        }
        
        // 容姿オプション
        if (data.appearances && Array.isArray(data.appearances)) {
            data.appearances.forEach(appearance => {
                const option = document.createElement('option');
                option.value = appearance;
                option.textContent = appearance;
                elements.appearanceSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('フィルターオプション読み込みエラー:', error);
    }
}

async function loadTherapists() {
    try {
        showLoading(true);
        
        // 全件取得するようにAPIパラメータを修正
        const response = await fetch('/api/search/therapists?per_page=2000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.therapists && Array.isArray(data.therapists)) {
            allTherapists = data.therapists;
            filteredTherapists = [...allTherapists];
            displayTherapists();
            console.log(`${allTherapists.length}人のセラピストデータを読み込みました`);
        } else {
            throw new Error('セラピストデータの形式が正しくありません');
        }
        
    } catch (error) {
        console.error('セラピストデータ読み込みエラー:', error);
        showError('セラピストデータの読み込みに失敗しました。');
    } finally {
        showLoading(false);
    }
}

function performSearch() {
    applyFilters();
}

function applyFilters() {
    let filtered = [...allTherapists];
    
    // キーワード検索
    const keyword = elements.searchInput.value.trim();
    if (keyword) {
        filtered = filtered.filter(therapist => 
            therapist.name.includes(keyword) || 
            therapist.shop_name.includes(keyword)
        );
    }
    
    // エリアフィルター
    const selectedArea = elements.areaSelect.value;
    if (selectedArea) {
        filtered = filtered.filter(therapist => therapist.shop_area === selectedArea);
    }
    
    // 年齢フィルター
    const selectedAge = elements.ageSelect.value;
    if (selectedAge) {
        filtered = filtered.filter(therapist => therapist.age_group === selectedAge);
    }
    
    // カップサイズフィルター
    const selectedCupSize = elements.cupSizeSelect.value;
    if (selectedCupSize) {
        filtered = filtered.filter(therapist => therapist.cup_size === selectedCupSize);
    }
    
    // プレイ内容フィルター
    const selectedPlayContent = elements.playContentSelect.value;
    if (selectedPlayContent) {
        filtered = filtered.filter(therapist => therapist.tolerance === selectedPlayContent);
    }
    
    // 容姿フィルター
    const selectedAppearance = elements.appearanceSelect.value;
    if (selectedAppearance) {
        filtered = filtered.filter(therapist => therapist.appearance === selectedAppearance);
    }
    
    // お気に入りのみフィルター
    if (elements.favoritesOnly.checked) {
        const favorites = getFavorites();
        filtered = filtered.filter(therapist => favorites.includes(therapist.id));
    }
    
    filteredTherapists = filtered;
    currentPage = 1;
    displayTherapists();
}

function displayTherapists() {
    // 全件表示（ページング制限を削除）
    const therapistsToShow = filteredTherapists;
    
    if (therapistsToShow.length === 0) {
        elements.therapistGrid.innerHTML = '';
        elements.noResults.style.display = 'block';
        return;
    }
    
    elements.noResults.style.display = 'none';
    
    const therapistCards = therapistsToShow.map(therapist => createTherapistCard(therapist)).join('');
    elements.therapistGrid.innerHTML = therapistCards;
    
    // カードクリックイベントの設定
    document.querySelectorAll('.therapist-card').forEach(card => {
        card.addEventListener('click', function() {
            const therapistId = parseInt(this.dataset.therapistId);
            showTherapistDetail(therapistId);
        });
    });
    
    console.log(`${therapistsToShow.length}人のセラピストカードを表示しました`);
}

function createTherapistCard(therapist) {
    const favorites = getFavorites();
    const isFavorite = favorites.includes(therapist.id);
    
    // 名前から年代表記を削除（例：「一ノ瀬 葵 (21)さん (20代)」→「一ノ瀬 葵 (21)さん」）
    let displayName = therapist.name;
    if (displayName.includes(' (20代)') || displayName.includes(' (30代)') || displayName.includes(' (10代)')) {
        displayName = displayName.replace(/ \(\d+代\)$/, '');
    }
    
    return `
        <div class="therapist-card" data-therapist-id="${therapist.id}">
            <div class="therapist-header">
                <div>
                    <h3 class="therapist-name">${displayName}</h3>
                    <div class="therapist-shop">${therapist.shop_name}</div>
                    <div class="therapist-area">${therapist.shop_area}</div>
                </div>
                <div class="age-badge">${therapist.age_group}</div>
            </div>
            
            <div class="therapist-tags">
                <span class="tag tag-cup-size">${therapist.cup_size}</span>
                <span class="tag tag-appearance">${therapist.appearance}</span>
            </div>
            
            <div class="therapist-actions">
                <div class="play-content-badge">${therapist.tolerance}</div>
                ${therapist.shop_url ? `<a href="${therapist.shop_url}" target="_blank" class="shop-url-btn" onclick="event.stopPropagation();">店舗ページ</a>` : ''}
            </div>
        </div>
    `;
}

function showTherapistDetail(therapistId) {
    const therapist = allTherapists.find(t => t.id === therapistId);
    if (!therapist) return;
    
    // 名前から年代表記を削除
    let cleanName = therapist.name;
    if (cleanName.includes(' (20代)') || cleanName.includes(' (30代)') || cleanName.includes(' (10代)')) {
        cleanName = cleanName.replace(/ \(\d+代\)$/, '');
    }
    
    // モーダル内容の更新
    document.getElementById('modalTherapistName').textContent = cleanName;
    document.getElementById('detailTherapistName').textContent = cleanName.replace(/ \(\d+\)さん$/, '');
    
    // 年齢表示を統一（年代のみ表示）
    document.getElementById('detailTherapistAge').textContent = therapist.age_group;
    
    document.getElementById('detailShopName').textContent = therapist.shop_name;
    document.getElementById('detailShopArea').textContent = therapist.shop_area;
    
    // 容姿・バストサイズ
    document.getElementById('detailAppearanceSize').innerHTML = `
        <span class="tag tag-cup-size">${therapist.cup_size}</span>
        <span class="tag tag-appearance">${therapist.appearance}</span>
    `;
    
    // 寛容傾向
    document.getElementById('detailTolerance').innerHTML = `
        <span class="tag tag-play-content">${therapist.tolerance}</span>
    `;
    
    // レビュー（全文表示）
    const reviewText = therapist.review_excerpt || 'レビューなし';
    document.getElementById('detailReviewExcerpt').textContent = reviewText;
    
    // お気に入りボタンの状態更新
    const favorites = getFavorites();
    const isFavorite = favorites.includes(therapist.id);
    elements.favoriteBtn.innerHTML = isFavorite ? 
        '<i class="fas fa-heart"></i> お気に入りから削除' : 
        '<i class="fas fa-heart"></i> お気に入りに追加';
    elements.favoriteBtn.dataset.therapistId = therapist.id;
    
    // 店舗URLボタンの設定
    if (therapist.shop_url) {
        elements.shopUrlBtn.style.display = 'inline-block';
        elements.shopUrlBtn.dataset.shopUrl = therapist.shop_url;
    } else {
        elements.shopUrlBtn.style.display = 'none';
    }
    
    // モーダル表示
    elements.therapistDetailModal.style.display = 'flex';
}

function closeModal() {
    elements.therapistDetailModal.style.display = 'none';
}

function toggleFavorite() {
    const therapistId = parseInt(elements.favoriteBtn.dataset.therapistId);
    if (!therapistId) return;
    
    let favorites = getFavorites();
    const isFavorite = favorites.includes(therapistId);
    
    if (isFavorite) {
        favorites = favorites.filter(id => id !== therapistId);
        elements.favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> お気に入りに追加';
    } else {
        favorites.push(therapistId);
        elements.favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> お気に入りから削除';
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // お気に入りのみ表示中の場合は再フィルタリング
    if (elements.favoritesOnly.checked) {
        applyFilters();
    }
}

function openShopUrl() {
    const shopUrl = elements.shopUrlBtn.dataset.shopUrl;
    if (shopUrl) {
        window.open(shopUrl, '_blank');
    }
}

function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

function showFavorites() {
    elements.favoritesOnly.checked = !elements.favoritesOnly.checked;
    applyFilters();
}

function showLoading(show) {
    if (show) {
        elements.loadingIndicator.style.display = 'block';
        elements.therapistGrid.style.display = 'none';
        elements.noResults.style.display = 'none';
    } else {
        elements.loadingIndicator.style.display = 'none';
        elements.therapistGrid.style.display = 'grid';
    }
}

function showError(message) {
    elements.loadingIndicator.style.display = 'none';
    elements.therapistGrid.style.display = 'none';
    elements.noResults.style.display = 'block';
    elements.noResults.textContent = message;
}

