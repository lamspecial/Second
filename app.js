// ============================================================
// app.js — آي أم سبيشل للضيافة الترفيهية — المنصة الرئيسية
// ============================================================

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
} catch (e) { 
    console.error("Firebase initialization failed:", e); 
}

const ADMIN_PIN = '4991';
let isAdminUnlocked = false;

// القائمة المعتمدة للهيكل الإداري للفروع (مديرات ونواب فروع) لربط دقيق
const branchesData = {
    1: { 
        bName: "شرق بلازا",     
        staff: [
            { name: "فاطمة السبيعي", title: "مديرة الفرع" },
            { name: "نورة القحطاني", title: "نائبة المديرة" }
        ]
    },
    2: { 
        bName: "الرياض جاليري", 
        staff: [
            { name: "سارة التميمي", title: "مديرة الفرع" },
            { name: "هند الرويلي", title: "نائبة المديرة" }
        ]
    }
};

let currentArticle = {
    title: "توجيه عام بخصوص حماية السمعة الرقمية والتشغيلية",
    body: "جاري تحميل نص دراسة الحالة والتوجيه الإداري من السيرفر الرئيسي..."
};

let replies = [];

function getSessionId() {
    let sId = localStorage.getItem('ispecial_session_id');
    if (!sId) {
        sId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('ispecial_session_id', sId);
    }
    return sId;
}

// تحديث خيارات الأسماء فور اختيار الفرع المحدد
function updateBranchStaffOptions() {
    const bVal = document.getElementById('branchSelect').value;
    const staffSelect = document.getElementById('staffSelect');
    staffSelect.innerHTML = '<option value="">اختر الاسم والمسمى...</option>';
    
    if (bVal && branchesData[bVal]) {
        branchesData[bVal].staff.forEach((member, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${member.name} (${member.title})`;
            staffSelect.appendChild(opt);
        });
    }
}

// جلب تفاصيل التوجيه الإداري من قاعدة البيانات
async function loadArticleFromFirebase() {
    if (!db) return;
    try {
        const doc = await db.collection('settings').doc('active_article').get();
        if (doc.exists) {
            currentArticle = doc.data();
        } else {
            await db.collection('settings').doc('active_article').set(currentArticle);
        }
    } catch (e) {
        console.error("Error loading article data:", e);
    }
}

// تحميل مرئيات وإجراءات الفروع في البث المباشر
async function loadRepliesFromFirebase() {
    if (!db) return;
    try {
        const snapshot = await db.collection('replies').orderBy('createdAt', 'desc').get();
        replies = [];
        snapshot.forEach(doc => {
            replies.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) {
        console.error("Error loading updates:", e);
    }
}

function renderArticle() {
    const titleEl = document.getElementById('articleTitle');
    const bodyEl = document.getElementById('articleBody');
    if (titleEl) titleEl.textContent = currentArticle.title;
    if (bodyEl) bodyEl.textContent = currentArticle.body;
}

// بناء البث المباشر للإجراءات المستلمة في شريط المتابعة الجانبي بالرئيسية
function renderReplies() {
    const listEl = document.getElementById('repliesList');
    if (!listEl) return;
    
    if (replies.length === 0) {
        listEl.innerHTML = `<div class="text-xs text-slate-400 text-center py-8">لا توجد تحديثات أو إجراءات مرسلة حالياً من الفروع.</div>`;
        return;
    }
    
    const parents = replies.filter(r => !r.parentId);
    
    listEl.innerHTML = parents.map(r => {
        const adminAnswers = replies.filter(sub => sub.parentId === r.id);
        const adminAnswersHtml = adminAnswers.map(ans => `
            <div class="mt-2.5 bg-rose-950/5 border border-rose-900/10 p-3 rounded-xl space-y-1">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-black text-rose-950">${ans.authorName}</span>
                    <span class="text-[10px] text-rose-900 bg-white px-2 py-0.5 rounded-md font-bold">${ans.authorTitle}</span>
                </div>
                <p class="text-xs text-slate-700 leading-relaxed">${ans.text}</p>
            </div>
        `).join('');

        return `
            <div class="bg-white/90 p-4 rounded-xl border border-rose-100 shadow-xs space-y-2 text-right transition hover:shadow-md">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <h4 class="text-xs font-black text-slate-900">${r.authorName}</h4>
                        <span class="text-[10px] text-slate-500 font-bold">${r.authorTitle} - فرع ${r.branchName}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-mono">${new Date(r.createdAt).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p class="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">${r.text}</p>
                ${adminAnswersHtml}
            </div>
        `;
    }).join('');
}

// تنفيذ وتقديم الإجراءات من الفروع للإدارة العليا
async function submitFeedback() {
    const bVal = document.getElementById('branchSelect').value;
    const sVal = document.getElementById('staffSelect').value;
    const text = document.getElementById('feedbackText').value.trim();
    
    if (!bVal) { alert('يرجى اختيار الفرع التابع لكِ أولاً'); return; }
    if (!sVal) { alert('يرجى تحديد الاسم والصفة الوظيفية المعتمدة'); return; }
    if (!text) { alert('يرجى كتابة تفاصيل الإجراء أو المرئيات لحماية السمعة'); return; }
    
    const branch = branchesData[bVal];
    const staffMember = branch.staff[sVal];
    
    const newFeedback = {
        branchName: branch.bName,
        authorName: staffMember.name,
        authorTitle: staffMember.title,
        text: text,
        sessionId: getSessionId(),
        createdAt: Date.now()
    };
    
    try {
        if (db) {
            await db.collection('replies').add(newFeedback);
        }
        document.getElementById('feedbackText').value = '';
        showCopyToast('سنتواصل معك خلال دقائق ✓'); // تطبيق التحديث المطلوب بالهوية المعجمية
        await loadRepliesFromFirebase();
        renderReplies();
    } catch (e) {
        console.error("Error submitting response:", e);
    }
}

// التحكم الإداري والأمان بالبوابة الرئيسية
function checkAdminAccess() {
    if (isAdminUnlocked) {
        openAdminModal();
    } else {
        document.getElementById('pinModal').style.display = 'flex';
    }
}

function closePinModal() {
    document.getElementById('pinModal').style.display = 'none';
    document.getElementById('pinInput').value = '';
}

function verifyAdminPin() {
    const pin = document.getElementById('pinInput').value;
    if (pin === ADMIN_PIN) {
        isAdminUnlocked = true;
        closePinModal();
        openAdminModal();
    } else {
        alert('الرمز السري المختار غير صحيح، يرجى المحاولة مرة أخرى.');
    }
}

function openAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
    document.getElementById('adminTitleInput').value = currentArticle.title;
    document.getElementById('adminBodyInput').value = currentArticle.body;
    renderAdminReplies();
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

async function saveArticleAdmin() {
    const title = document.getElementById('adminTitleInput').value.trim();
    const body = document.getElementById('adminBodyInput').value.trim();
    if (!title || !body) { alert('يرجى ملء جميع الحقول الإدارية'); return; }
    
    currentArticle = { title, body };
    try {
        if (db) {
            await db.collection('settings').doc('active_article').set(currentArticle);
        }
        renderArticle();
        closeAdminModal();
        showCopyToast('تم تحديث دراسة الحالة ونشر التعميم الرئيسي ✓');
    } catch (e) {
        console.error("Error saving updates to firebase:", e);
    }
}

function renderAdminReplies() {
    const adminRepliesList = document.getElementById('adminRepliesList');
    if (!adminRepliesList) return;
    
    const branchFeedbacks = replies.filter(r => !r.parentId);
    
    if (branchFeedbacks.length === 0) {
        adminRepliesList.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">لا توجد مرئيات تحتاج إلى رد وتوجيه حالياً.</p>`;
        return;
    }
    
    adminRepliesList.innerHTML = branchFeedbacks.map(c => {
        return `
        <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-right">
            <div class="text-xs font-bold text-slate-800">إجراء من: ${c.authorName} (${c.authorTitle} - فرع ${c.branchName})</div>
            <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-md">${c.text}</p>
            <div class="pt-2">
                <textarea id="adminReplyText-${c.id}" rows="2" class="w-full p-2 border border-slate-200 rounded-lg text-xs" placeholder="اكتبي توجيه الرد كإدارة عليا..."></textarea>
                <button onclick="submitAdminReply('${c.id}')" class="mt-2 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition">إرسال التوجيه المباشر</button>
            </div>
        </div>`;
    }).join('');
}

async function submitAdminReply(parentId) {
    const textEl = document.getElementById(`adminReplyText-${parentId}`);
    const text = textEl?.value.trim();
    if (!text) { alert('يرجى كتابة نص التوجيه/الرد أولاً'); return; }
    
    const newAdminReply = {
        parentId,
        authorName: "الإدارة العليا",
        authorTitle: "إدارة آي أم سبيشل",
        text,
        sessionId: getSessionId(),
        createdAt: Date.now()
    };
    
    try {
        if (db) {
            await db.collection('replies').add(newAdminReply);
        }
        showCopyToast('تم إرسال التوجيه والرد بنجاح ✓');
        await loadRepliesFromFirebase();
        renderAdminReplies();
        renderReplies();
    } catch (e) {
        console.error("Error submitting administrative response:", e);
    }
}

function showCopyToast(msg) {
    const toast = document.getElementById('copyToast');
    const toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.style.display = 'block';
        toast.classList.add('copy-toast');
        setTimeout(() => {
            toast.style.display = 'none';
            toast.classList.remove('copy-toast');
        }, 3000);
    }
}

// تهيئة البوابة والتطبيق فور التحميل الأولي للمتصفح
document.addEventListener('DOMContentLoaded', async () => {
    const lo = document.getElementById('loadingOverlay');
    getSessionId();

    try {
        await Promise.all([loadArticleFromFirebase(), loadRepliesFromFirebase()]);
    } catch (e) {
        console.error("Data synchronization error:", e);
    }

    renderArticle();
    renderReplies();

    if (lo) {
        lo.style.opacity = '0';
        setTimeout(() => {
            lo.style.display = 'none';
        }, 400);
    }
});
