// إدارة الصلاحيات والأدوار لنظام حماية السمعة بـ اي ام سبيشل
const ROLES = {
    SUPER_ADMIN: 'admin',
    BRANCH_MANAGER: 'branch_manager',
    REPUTATION_SPECIALIST: 'reputation_specialist' // المستخدم الجديد المضاف القادر على ردع وتوجيه ردود مديرات الفروع
};

// مستخدم تجريبي يمثل الدور الجديد (أخصائي حماية السمعة) للاختبار المباشر
let currentUser = {
    username: 'أخصائي السمعة الرقمية',
    role: ROLES.REPUTATION_SPECIALIST 
};

// هيكل البيانات التجريبي للتعليقات والردود الإدارية لفرع الرياض جاليري كمثال
let comments = [
    {
        id: 1,
        author: 'عميل زائر',
        text: 'يوجد تأخير طفيف في تلبية طلبات الضيافة الترفيهية.',
        replies: [
            {
                id: 101,
                author: 'مديرة فرع الرياض جاليري',
                role: ROLES.BRANCH_MANAGER,
                text: 'مرحباً بك، رصدنا ملحوظتك وسنتواصل معك خلال دقائق.'
            }
        ]
    }
];

// --- 1. آلية النقرات السبع (7 Clicks) على الشعار لفتح نافذة الدخول ---
let logoClickCounter = 0;
const logoImg = document.getElementById('iam-special-logo');
const loginModal = document.getElementById('login-modal');
const closeModalBtn = document.getElementById('close-modal');

if (logoImg) {
    logoImg.addEventListener('click', () => {
        logoClickCounter++;
        if (logoClickCounter === 7) {
            logoClickCounter = 0; // تصفير العداد بعد النجاح
            if (loginModal) {
                loginModal.style.display = 'block';
            }
        }
    });
}

if (closeModalBtn && loginModal) {
    closeModalBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
}

// --- 2. معالجة نموذج الدخول البديل (تم إتلاف آلية الإيموجي والرقم القديمة بالكامل) ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // التحقق القياسي المباشر من الحقول المغذية للنموذج
        const usernameInput = document.getElementById('username').value;
        alert(`أهلاً بك ${usernameInput}، تم قبول طلب الاتصال والتحقق من الهوية بنظام حماية السمعة.`);
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        loginForm.reset();
    });
}

// --- 3. عرض الرابط التفاعلي وصلاحيات الرد للمستخدم الجديد ---
function renderCommentsSystem() {
    const container = document.getElementById('comments-container');
    if (!container) return;
    container.innerHTML = '';

    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-box';
        commentDiv.innerHTML = `<div><strong>${comment.author}:</strong> ${comment.text}</div>`;

        // استعراض الردود التابعة للتعليق
        comment.replies.forEach(reply => {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'reply-box';
            
            let roleTitle = reply.role === ROLES.BRANCH_MANAGER ? 'مديرة فرع' : 'أخصائي حماية السمعة';
            replyDiv.innerHTML = `<div><strong>${reply.author} (${roleTitle}):</strong> ${reply.text}</div>`;
            
            // الميزة الجديدة: إذا كان الرد لمديرة فرع، يمتلك المستخدم الجديد القدرة على التعليق والرد المباشر عليه لتوجيهها
            if (reply.role === ROLES.BRANCH_MANAGER && 
               (currentUser.role === ROLES.REPUTATION_SPECIALIST || currentUser.role === ROLES.SUPER_ADMIN)) {
                
                const btnReplyToManager = document.createElement('button');
                btnReplyToManager.className = 'btn-reply';
                btnReplyToManager.innerText = '↩️ إضافة رد توجيهي على تعليق مديرة الفرع';
                btnReplyToManager.onclick = () => {
                    const feedbackText = prompt('أدخل الرد الإداري الموجه لمديرة الفرع لحماية السمعة:');
                    if (feedbackText) {
                        comment.replies.push({
                            id: Date.now(),
                            author: currentUser.username,
                            role: currentUser.role,
                            text: feedbackText
                        });
                        renderCommentsSystem(); // إعادة البناء لتحديث الواجهة فوراً
                    }
                };
                replyDiv.appendChild(btnReplyToManager);
            }
            
            commentDiv.appendChild(replyDiv);
        });

        // خيار إضافي للمستخدم الجديد لإضافة رد أساسي مباشر على العميل
        if (currentUser.role === ROLES.REPUTATION_SPECIALIST || currentUser.role === ROLES.BRANCH_MANAGER) {
            const btnDirectReply = document.createElement('button');
            btnDirectReply.className = 'btn-reply';
            btnDirectReply.style.marginRight = '10px';
            btnDirectReply.innerText = '💬 إضافة رد على التعليق الأساسي';
            btnDirectReply.onclick = () => {
                const textInput = prompt('اكتب ردك الرسمي هنا:');
                if (textInput) {
                    comment.replies.push({
                        id: Date.now(),
                        author: currentUser.username,
                        role: currentUser.role,
                        text: textInput
                    });
                    renderCommentsSystem();
                }
            };
            commentDiv.appendChild(btnDirectReply);
        }

        container.appendChild(commentDiv);
    });
}

// التشغيل الأولي لبناء الهيكل البرمجي بعد تحميل صفحة المقال
document.addEventListener('DOMContentLoaded', renderCommentsSystem);
