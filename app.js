// ============================================================
// app.js — آي أم سبيشل — النسخة الخاصة (دراسة حالة فقط)
// ============================================================

// ---- Firebase ----
const firebaseConfig = {
    apiKey: "AIzaSyAkZHewymPnTYF43CzweqlzCN5w1bWSOZI",
    authDomain: "ispecial.firebaseapp.com",
    projectId: "ispecial",
    storageBucket: "ispecial.firebasestorage.app",
    messagingSenderId: "86730383077",
    appId: "1:86730383077:web:ebdf3c92e2239d477f7e0c"
};

let db = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
        db.enablePersistence({ synchronizeTabs: false }).catch(() => {});
    }
} catch (e) { console.error("Firebase init error:", e); }

// ---- الرقم السري للدخول إلى تعديل المقال ----
const ADMIN_PIN = '4991';
let isAdminUnlocked = false;

// ---- قائمة مديرات/نائبات الفروع (لاختيار الاسم عند المشاركة) ----
const branchesData = {
    1: { bName:"شرق بلازا",     mName:"فاطمة السبيعي",  dName:"" },
    2: { bName:"الرياض جاليري", mName:"",                dName:"فاطمة جعفري" },
    3: { bName:"ذافيو",          mName:"اسمهان الغامدي", dName:"فاطمة الحارثي" },
    4: { bName:"القصر مول",      mName:"منيره هزري",     dName:"" },
    5: { bName:"سلام مول",       mName:"هند المطيري",    dName:"نوف هزازي" },
    6: { bName:"مركز المملكة",   mName:"",                dName:"هاجر القاسمي" }
};

// ---- حالة المقال والردود ----
let article = {
    title: "دراسة حالة: كيف نتعامل مع انخفاض التقييمات؟",
    body: "هذا نص افتراضي لدراسة الحالة. يمكن للمشرف تعديله من خلال الضغط 7 مرات على شعار «أي آم سبيشل» في الأعلى ثم إدخال الرقم السري.",
    updatedAt: Date.now()
};
let replies = []; // { id, parentId, role, authorName, authorTitle, text, createdAt }

let sessionId = null;
function getSessionId() {
    if (!sessionId) {
        sessionId = localStorage.getItem('ispecial_special_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('ispecial_special_session_id', sessionId);
        }
    }
    return sessionId;
}

// ============================================================
// Firebase helpers
// ============================================================
async function loadArticleFromFirebase() {
    if (!db) return;
    try {
        const doc = await db.collection('appData').doc('specialArticle').get();
        if (doc.exists) {
            const d = doc.data();
            if (d.title) article.title = d.title;
            if (d.body)  article.body  = d.body;
            if (d.updatedAt) article.updatedAt = d.updatedAt;
        }
    } catch (e) { console.error('loadArticle error', e); }
}

async function saveArticleToFirebase() {
    if (!db) return;
    try {
        await db.collection('appData').doc('specialArticle').set(article);
    } catch (e) { console.error('saveArticle error', e); }
}

async function loadRepliesFromFirebase() {
    if (!db) return;
    try {
        const doc = await db.collection('appData').doc('specialReplies').get();
        if (doc.exists) replies = doc.data().data || [];
    } catch (e) { console.error('loadReplies error', e); }
}

async function saveRepliesToFirebase() {
    if (!db) return;
    try {
        await db.collection('appData').doc('specialReplies').set({ data: replies });
    } catch (e) { console.error('saveReplies error', e); }
}

// ============================================================
// عرض المقال
// ============================================================
function renderArticle() {
    document.getElementById('articleTitle').textContent = article.title;
    document.getElementById('articleBody').textContent = article.body;
}

// ============================================================
// عرض الردود (متداخلة: رد مديرة الفرع + ردود المشرفة/الإدارة تحته)
// ============================================================
function renderReplies() {
    const container = document.getElementById('repliesList');
    const topLevel = replies.filter(r => !r.parentId).sort((a,b) => a.createdAt - b.createdAt);

    if (!topLevel.length) {
        container.innerHTML = `<p class="text-slate-500 text-sm text-center py-4">لا توجد مشاركات بعد. كوني أول من يشارك رأيها.</p>`;
        return;
    }

    container.innerHTML = topLevel.map(c => {
        const children = replies.filter(r => r.parentId === c.id).sort((a,b) => a.createdAt - b.createdAt);
        const childrenHTML = children.map(ch => `
            <div class="nested-reply ${ch.role === 'admin' ? 'admin-reply' : ''}">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-slate-800 text-sm font-black">${escapeHtml(ch.authorName)}</span>
                    <span class="text-slate-400 text-xs font-medium">/ ${escapeHtml(ch.authorTitle)}</span>
                </div>
                <p class="text-slate-700 leading-relaxed text-justify font-medium text-sm comment-text">${escapeHtml(ch.text)}</p>
            </div>
        `).join('');

        return `
        <div class="comment-block">
            <div class="flex items-center gap-2 mb-1.5">
                <span class="text-slate-800 text-sm font-black">${escapeHtml(c.authorName)}</span>
                <span class="text-slate-400 text-xs font-medium">/ ${escapeHtml(c.authorTitle)}</span>
            </div>
            <p class="text-slate-700 leading-relaxed text-justify font-medium text-base comment-text">${escapeHtml(c.text)}</p>
            <div class="mt-3">
                <button onclick="toggleSupervisorReply('${c.id}')" class="text-xs font-bold text-rose-600 hover:text-rose-800 transition">
                    الرد كمشرفة الفروع
                </button>
            </div>
            <div id="supervisorForm-${c.id}" class="mt-3 hidden"></div>
            ${childrenHTML}
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showCopyToast(msg) {
    const t = document.getElementById('copyToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.add('show', 'copy-toast');
    setTimeout(() => { t.classList.add('hidden'); t.classList.remove('show', 'copy-toast'); }, 2500);
}

// ============================================================
// تدفق «مديرات الفروع»: اختيار الفرع ثم الاسم ثم كتابة الرأي
// ============================================================
function buildManagerStep1() {
    const branches = Object.entries(branchesData).map(([id, d]) => {
        const people = [];
        if (d.mName) people.push({ id: `m_${id}`, name: d.mName, title: `مديرة فرع ${d.bName}` });
        if (d.dName) people.push({ id: `d_${id}`, name: d.dName, title: `نائبة مديرة فرع ${d.bName}` });
        return { id, bName: d.bName, people };
    }).filter(b => b.people.length > 0);

    return `
    <div class="comment-step">
        <p class="text-sm font-bold text-slate-600 mb-4">اختاري الفرع:</p>
        <div class="grid grid-cols-2 gap-2">
            ${branches.map(b => `
                <button onclick='selectManagerBranch(${JSON.stringify(b.people)})'
                    class="glass-panel border border-white/60 rounded-xl p-3 text-right hover:-translate-y-0.5 transition-transform cursor-pointer">
                    <p class="font-black text-slate-900 text-sm">فرع ${b.bName}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${b.people.map(p=>p.name).join(' — ')}</p>
                </button>
            `).join('')}
        </div>
        <button onclick="cancelManagerFlow()" class="mt-4 w-full btn-outline btn-outline-slate text-xs py-2 rounded-lg">إلغاء</button>
    </div>`;
}

function startManagerFlow() {
    const el = document.getElementById('managerFlowContainer');
    document.getElementById('mainReplyActions').classList.add('hidden');
    el.innerHTML = buildManagerStep1();
}

function cancelManagerFlow() {
    document.getElementById('managerFlowContainer').innerHTML = '';
    document.getElementById('mainReplyActions').classList.remove('hidden');
}

function selectManagerBranch(people) {
    const el = document.getElementById('managerFlowContainer');
    el.innerHTML = `
    <div class="comment-step">
        <p class="text-sm font-bold text-slate-600 mb-4">اختاري اسمك:</p>
        <div class="flex flex-col gap-2">
            ${people.map(p => `
                <button onclick="selectManagerPerson('${p.id}', '${escapeAttr(p.name)}', '${escapeAttr(p.title)}')"
                    class="glass-panel border border-white/60 rounded-xl p-3 text-right hover:-translate-y-0.5 transition-transform cursor-pointer flex items-center gap-3">
                    <div class="w-9 h-9 bg-white/70 rounded-full flex items-center justify-center font-black text-slate-800 text-sm border border-white flex-shrink-0">${p.name.charAt(0)}</div>
                    <div>
                        <p class="font-black text-slate-900 text-sm">${p.name}</p>
                        <p class="text-xs text-slate-500">${p.title}</p>
                    </div>
                </button>
            `).join('')}
        </div>
        <button onclick="startManagerFlow()" class="mt-4 w-full btn-outline btn-outline-slate text-xs py-2 rounded-lg">← السابق</button>
    </div>`;
}

function escapeAttr(str) { return String(str).replace(/'/g, "\\'"); }

function selectManagerPerson(personId, personName, personTitle) {
    const el = document.getElementById('managerFlowContainer');
    el.innerHTML = `
    <div class="comment-step">
        <div class="flex items-center gap-2 mb-3 bg-white/30 px-3 py-2 rounded-lg">
            <div class="w-8 h-8 bg-white/70 rounded-full flex items-center justify-center font-black text-slate-800 text-sm border border-white flex-shrink-0">${personName.charAt(0)}</div>
            <div>
                <p class="font-bold text-slate-900 text-sm">${personName}</p>
                <p class="text-xs text-slate-500">${personTitle}</p>
            </div>
        </div>
        <textarea id="managerTextInput" rows="4" class="w-full p-3 rounded-xl glass-input text-sm leading-relaxed resize-y mb-3" placeholder="اكتبي رأيك حول دراسة الحالة..."></textarea>
        <div class="flex gap-2">
            <button onclick="submitManagerReply('${personId}', '${escapeAttr(personName)}', '${escapeAttr(personTitle)}')"
                class="flex-1 btn-solid-dark py-2.5 rounded-xl text-sm font-black">إرسال</button>
            <button onclick="startManagerFlow()" class="btn-outline btn-outline-slate text-xs px-4 py-2 rounded-xl">←</button>
        </div>
    </div>`;
    setTimeout(() => document.getElementById('managerTextInput')?.focus(), 100);
}

async function submitManagerReply(personId, personName, personTitle) {
    const text = document.getElementById('managerTextInput')?.value.trim();
    if (!text) { alert('يرجى كتابة الرأي'); return; }
    replies.push({
        id: 'r_' + Date.now(),
        parentId: null,
        role: 'manager',
        authorId: personId,
        authorName: personName,
        authorTitle: personTitle,
        text,
        sessionId: getSessionId(),
        createdAt: Date.now()
    });
    await saveRepliesToFirebase();
    cancelManagerFlow();
    renderReplies();
    showCopyToast('تم إضافة رأيك ✓');
}

// ============================================================
// تدفق «مشرفة الفروع»: الرد على رأي مديرة فرع
// ============================================================
function toggleSupervisorReply(parentId) {
    const el = document.getElementById(`supervisorForm-${parentId}`);
    if (!el) return;
    if (!el.classList.contains('hidden')) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
    }
    el.classList.remove('hidden');
    el.innerHTML = `
    <div class="comment-step bg-white/30 rounded-xl p-3">
        <input type="text" id="supervisorName-${parentId}" class="w-full p-2.5 rounded-lg glass-input text-sm mb-2" placeholder="اسمك (مشرفة الفروع)">
        <textarea id="supervisorText-${parentId}" rows="3" class="w-full p-2.5 rounded-lg glass-input text-sm leading-relaxed resize-y mb-2" placeholder="اكتبي ردك..."></textarea>
        <div class="flex gap-2">
            <button onclick="submitSupervisorReply('${parentId}')" class="flex-1 btn-outline btn-outline-rose text-xs py-2 rounded-lg font-bold">إرسال الرد</button>
            <button onclick="toggleSupervisorReply('${parentId}')" class="btn-outline btn-outline-slate text-xs px-3 py-2 rounded-lg">إلغاء</button>
        </div>
    </div>`;
}

async function submitSupervisorReply(parentId) {
    const nameInput = document.getElementById(`supervisorName-${parentId}`);
    const textInput = document.getElementById(`supervisorText-${parentId}`);
    const name = nameInput?.value.trim();
    const text = textInput?.value.trim();
    if (!name || !text) { alert('يرجى إدخال الاسم والرد'); return; }
    replies.push({
        id: 'r_' + Date.now(),
        parentId,
        role: 'supervisor',
        authorName: name,
        authorTitle: 'مشرفة الفروع',
        text,
        sessionId: getSessionId(),
        createdAt: Date.now()
    });
    await saveRepliesToFirebase();
    renderReplies();
    showCopyToast('تم إضافة ردك ✓');
}

// ============================================================
// الدخول الخفي: 7 ضغطات على الشعار → الرقم السري → تعديل المقال
// ============================================================
let logoClickCount = 0;
let logoClickTimer = null;

document.getElementById('logoClick')?.addEventListener('click', () => {
    logoClickCount++;
    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 1500);
    if (logoClickCount >= 7) {
        logoClickCount = 0;
        openPinModal();
    }
});

function openPinModal() {
    document.getElementById('pinModal').style.display = 'flex';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').classList.add('hidden');
    setTimeout(() => document.getElementById('pinInput')?.focus(), 100);
}

function closePinModal() {
    document.getElementById('pinModal').style.display = 'none';
}

function checkPin() {
    const val = document.getElementById('pinInput')?.value.trim();
    if (val === ADMIN_PIN) {
        isAdminUnlocked = true;
        closePinModal();
        openAdminModal();
    } else {
        document.getElementById('pinError').classList.remove('hidden');
    }
}

document.getElementById('pinInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPin();
});

// ============================================================
// نافذة تعديل المقال (المشرف)
// ============================================================
function openAdminModal() {
    document.getElementById('adminTitleInput').value = article.title;
    document.getElementById('adminBodyInput').value = article.body;
    renderAdminReplies();
    document.getElementById('adminModal').style.display = 'flex';
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

async function saveArticleAdmin() {
    const title = document.getElementById('adminTitleInput')?.value.trim();
    const body  = document.getElementById('adminBodyInput')?.value.trim();
    if (!title || !body) { alert('يرجى إدخال العنوان والمحتوى'); return; }
    article.title = title;
    article.body  = body;
    article.updatedAt = Date.now();
    await saveArticleToFirebase();
    renderArticle();
    showCopyToast('تم حفظ المقال ✓');
}

function renderAdminReplies() {
    const container = document.getElementById('adminRepliesList');
    const topLevel = replies.filter(r => !r.parentId).sort((a,b) => a.createdAt - b.createdAt);
    if (!topLevel.length) {
        container.innerHTML = `<p class="text-slate-500 text-sm text-center py-2">لا توجد ردود بعد.</p>`;
        return;
    }
    container.innerHTML = topLevel.map(c => {
        const children = replies.filter(r => r.parentId === c.id).sort((a,b) => a.createdAt - b.createdAt);
        const childrenHTML = children.map(ch => `
            <div class="nested-reply ${ch.role === 'admin' ? 'admin-reply' : ''}">
                <p class="text-xs font-black text-slate-700">${escapeHtml(ch.authorName)} <span class="text-slate-400 font-medium">/ ${escapeHtml(ch.authorTitle)}</span></p>
                <p class="text-slate-700 text-sm">${escapeHtml(ch.text)}</p>
            </div>
        `).join('');
        return `
        <div class="comment-block bg-white/20 rounded-xl p-3">
            <p class="text-sm font-black text-slate-800">${escapeHtml(c.authorName)} <span class="text-xs text-slate-400 font-medium">/ ${escapeHtml(c.authorTitle)}</span></p>
            <p class="text-slate-700 text-sm mt-1">${escapeHtml(c.text)}</p>
            ${childrenHTML}
            <div class="mt-3">
                <textarea id="adminReplyText-${c.id}" rows="2" class="w-full p-2 rounded-lg glass-input text-xs" placeholder="ردك كإدارة..."></textarea>
                <button onclick="submitAdminReply('${c.id}')" class="mt-2 btn-outline btn-outline-emerald text-xs px-3 py-1.5 rounded-lg font-bold">إرسال الرد</button>
            </div>
        </div>`;
    }).join('');
}

async function submitAdminReply(parentId) {
    const textEl = document.getElementById(`adminReplyText-${parentId}`);
    const text = textEl?.value.trim();
    if (!text) { alert('يرجى كتابة الرد'); return; }
    replies.push({
        id: 'r_' + Date.now(),
        parentId,
        role: 'admin',
        authorName: 'الإدارة',
        authorTitle: 'إدارة أي آم سبيشل',
        text,
        sessionId: getSessionId(),
        createdAt: Date.now()
    });
    await saveRepliesToFirebase();
    renderAdminReplies();
    renderReplies();
    showCopyToast('تم إرسال الرد ✓');
}

// ============================================================
// تحميل أولي
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    const lo = document.getElementById('loadingOverlay');
    getSessionId();

    await Promise.all([loadArticleFromFirebase(), loadRepliesFromFirebase()]).catch(() => {});

    renderArticle();
    renderReplies();

    if (lo) {
        lo.style.transition = 'opacity 0.4s ease';
        lo.style.opacity = '0';
        setTimeout(() => { lo.style.display = 'none'; }, 400);
    }
});
