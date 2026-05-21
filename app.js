// ==========================================================================
// 🌌 核心設定：雲端即時資料庫 (Supabase) 的連線密鑰
// ==========================================================================
// 晚點我們會去 Supabase 網站後台複製這兩個重要欄位填進來唷！
const SUPABASE_URL = 'https://cdwldlweaeidkbnypebe.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd2xkbHdlYWVpZGtibnlwZWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjk1NjYsImV4cCI6MjA5NDk0NTU2Nn0.bDNPIgJdaNizGxBGyHZ2lQy5cGrnS3W3z4xaSOVSdJY';

// ==========================================================================
// 🛒 網頁元件取得 (DOM Elements)
// ==========================================================================
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const enterBtn = document.getElementById('enterBtn');

const groupIdInput = document.getElementById('groupId');
const usernameInput = document.getElementById('username');
const displayGroupName = document.getElementById('displayGroupName');
const displayUser = document.getElementById('displayUser');

const itemNameInput = document.getElementById('itemName');
const itemUrlInput = document.getElementById('itemUrl');
const itemNoteInput = document.getElementById('itemNote');
const itemImageInput = document.getElementById('itemImage');
const addBtn = document.getElementById('addBtn');
const listContainer = document.getElementById('listContainer');
const itemCount = document.getElementById('itemCount');

// ==========================================================================
// 🐹 使用者狀態與角色頭像清單
// ==========================================================================
let currentRole = 'chiikawa'; // 預設吉伊
let currentGroup = '';
let currentName = '';
let shoppingList = [];

const roleConfig = {
    chiikawa: { img: 'https://img2.91mai.com/o2o/image/cc99fb35-c605-4666-9cf7-6058c47f7645.jpg', name: '吉伊卡哇', color: 'bg-[#FFF0F5]' },
    hachiware: { img: 'https://img2.91mai.com/o2o/image/65431ff4-7c34-49e3-9240-5d92ace16fab.jpg', name: '小八貓', color: 'bg-[#E0F2FE]' },
    usagi: { img: 'https://img2.91mai.com/o2o/image/60817ea8-a092-4239-a4fe-2eb0a8db4b8e.jpg', name: '烏薩奇', color: 'bg-[#FEF08A]' },
    momonga: { img: 'https://img2.91mai.com/o2o/image/353a710a-89cb-439f-ab29-7d9e88824f91.jpg', name: '飛鼠', color: 'bg-purple-100' }
};

// 選擇角色點擊事件
window.selectRole = function(role, element) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('border-[#4B4B4B]');
        btn.classList.add('border-transparent');
    });
    element.classList.remove('border-transparent');
    element.classList.add('border-[#4B4B4B]');
}

// 點擊「進入房間」按鈕
enterBtn.addEventListener('click', async () => {
    const group = groupIdInput.value.trim().toLowerCase(); // 自動轉小寫防呆
    const name = usernameInput.value.trim();

    if (!group || !name) {
        alert('請填寫群組房間號碼與你的暱稱唷！');
        return;
    }

    currentGroup = group;
    currentName = name;

    // ✨ 修正 Bug 2：將原本 textContent 換成 innerHTML，才能成功塞入可愛大頭貼標籤
    displayGroupName.textContent = `房間：${currentGroup}`;
    displayUser.innerHTML = `
        <img src="${roleConfig[currentRole].img}" class="w-5 h-5 inline-block rounded-full mr-1 object-contain align-middle">
        <span class="font-bold align-middle">${currentName}</span> <span class="text-gray-400 text-xs align-middle">(${roleConfig[currentRole].name})</span>
    `;

    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');

    // 🚀 初始化 Supabase 並撈取即時雲端資料
    initSupabase();
});

// 離開房間
window.leaveRoom = function() {
    loginScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
}

// ==========================================================================
// ☁️ Supabase 雲端資料庫邏輯（包含 Realtime 即時同步監聽）
// ==========================================================================
let supabaseClient = null;

function initSupabase() {
    // 防呆：如果尚未填入正確 Key，先改用本地 localStorage 模擬，避免網頁壞掉
    if (SUPABASE_URL.includes('你的專案代碼')) {
        console.warn("⚠️ 目前偵測到尚未設定 Supabase 連線密鑰，系統自動切換為本機 localStorage 模擬模式！");
        shoppingList = JSON.parse(localStorage.getItem(`group_${currentGroup}`)) || [];
        renderList();
        return;
    }

    // 1. 初始化連線客戶端
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. 抓取雲端上屬於這個房間的全部購物卡片
    fetchItems();

    // 3. 🔥 開啟 Realtime 魔法：監聽全世界的手機，只要資料庫有變動就「免整理即時刷新」！
    supabaseClient
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
            fetchItems(); // 資料庫有任何人新增、打勾、刪除，所有人的手機同步重新撈取最新狀態
        })
        .subscribe();
}

// 從雲端抓取清單
async function fetchItems() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
        .from('shopping_items')
        .select('*')
        .eq('group_id', currentGroup)
        .order('id', { ascending: false }); // 讓最新新增的排在最上面

    if (error) {
        console.error('抓取雲端資料失敗:', error);
    } else {
        shoppingList = data;
        renderList();
    }
}

// 監聽「放進許願池」按鈕
addBtn.addEventListener('click', () => {
    const name = itemNameInput.value.trim();
    const url = itemUrlInput.value.trim();
    const note = itemNoteInput.value.trim();
    const imageFile = itemImageInput.files[0];

    if (!name) {
        alert('請輸入商品名稱！');
        return;
    }

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            saveItem(name, url, note, e.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveItem(name, url, note, null);
    }
});

// 新增卡片至雲端
async function saveItem(name, url, note, imageBase64) {
    const newItem = {
        group_id: currentGroup,
        name: name,
        url: url,
        note: note,
        image: imageBase64,
        is_bought: false,
        creator: currentName,
        creator_role: currentRole
    };

    if (supabaseClient) {
        // 連線模式：直接塞入雲端資料庫
        const { error } = await supabaseClient.from('shopping_items').insert([newItem]);
        if (error) alert('雲端儲存失敗：' + error.message);
    } else {
        // 模擬模式：寫入本機
        const localItem = { id: Date.now(), ...newItem, isBought: false, creatorRole: currentRole };
        shoppingList.unshift(localItem);
        localStorage.setItem(`group_${currentGroup}`, JSON.stringify(shoppingList));
        renderList();
    }
    clearForm();
}

// ==========================================================================
// 🎨 渲染與卡片繪製邏輯
// ==========================================================================
function renderList() {
    listContainer.innerHTML = '';
    itemCount.textContent = `${shoppingList.length} 項`;

    if (shoppingList.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-400 py-8 text-xs">目前還沒有許願商品，打字新增一個吧！</p>`;
        return;
    }

    shoppingList.forEach(item => {
        const card = document.createElement('div');
        
        // 為了相容 Supabase (底線) 與 LocalStorage 的欄位命名差別
        const isBought = item.is_bought !== undefined ? item.is_bought : item.isBought;
        const creatorRole = item.creator_role || item.creatorRole || 'chiikawa';
        const itemId = item.id;

        const role = roleConfig[creatorRole] || roleConfig.chiikawa;
        
        card.className = `bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition ${isBought ? 'opacity-40 border-gray-100' : 'border-[#E0F2FE]'}`;
        
        // ✨ 修正 Bug 1：將原本顯示文字 ${role.emoji} 的位子，優雅換成超精緻的圓滾滾角色頭像 <img> 標籤
        card.innerHTML = `
            <div class="p-4 flex gap-3">
                ${item.image ? `<img src="${item.image}" class="w-20 h-20 object-cover rounded-2xl border flex-shrink-0">` : `
                    <div class="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 text-xs flex-shrink-0 font-bold tracking-wider">NO IMAGE</div>
                `}
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                        <h3 class="font-bold text-sm text-[#4B4B4B] truncate ${isBought ? 'line-through text-gray-400' : ''}">${item.name}</h3>
                        <input type="checkbox" ${isBought ? 'checked' : ''} onclick="toggleStatus(${itemId}, ${isBought})" class="w-5 h-5 rounded-full text-blue-400 border-gray-300 focus:ring-0 cursor-pointer ml-1">
                    </div>
                    
                    ${item.note ? `<p class="text-xs text-gray-500 mt-1 break-words">${item.note}</p>` : ''}
                    
                    <div class="flex items-center justify-between mt-2">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${role.color} text-gray-700">
                            <img src="${role.img}" class="w-3.5 h-3.5 rounded-full object-contain"> ${item.creator}
                        </span>
                        
                        ${item.url ? `<a href="${item.url}" target="_blank" class="text-xs text-blue-400 hover:underline">🔗 看連結</a>` : ''}
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 px-4 py-1 flex justify-end border-t border-gray-50">
                <button onclick="deleteItem(${itemId})" class="text-[10px] text-gray-400 hover:text-red-400 font-bold">刪除 🗑️</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 狀態打勾處理
window.toggleStatus = async function(id, currentStatus) {
    const nextStatus = !currentStatus;

    if (supabaseClient) {
        const { error } = await supabaseClient.from('shopping_items').update({ is_bought: nextStatus }).eq('id', id);
        if (error) alert('修改失敗：' + error.message);
    } else {
        shoppingList = shoppingList.map(item => {
            if (item.id === id) item.isBought = nextStatus;
            return item;
        });
        localStorage.setItem(`group_${currentGroup}`, JSON.stringify(shoppingList));
        renderList();
    }

    // 🐰 療癒小彩蛋
    if (nextStatus && currentRole === 'usagi') {
        alert('🐰：烏拉ーー！！(買到了)');
    }
};

// 刪除卡片
window.deleteItem = async function(id) {
    if (!confirm('要把這個願望刪除嗎？')) return;

    if (supabaseClient) {
        const { error } = await supabaseClient.from('shopping_items').delete().eq('id', id);
        if (error) alert('刪除失敗：' + error.message);
    } else {
        shoppingList = shoppingList.filter(item => item.id !== id);
        localStorage.setItem(`group_${currentGroup}`, JSON.stringify(shoppingList));
        renderList();
    }
};

function clearForm() {
    itemNameInput.value = '';
    itemUrlInput.value = '';
    itemNoteInput.value = '';
    itemImageInput.value = '';
}