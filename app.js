/* ============================================
   LIQUID LUXURY BOOKSTORE - APP.JS
   ============================================ */

// ============================================
// SERVER SYNC SYSTEM
// نظام المزامنة مع الخادم المركزي
// ============================================

// وضع المزامنة - true = استخدام الخادم, false = استخدام localStorage فقط
// مفعّل لاستضافة Node.js مثل HostingGuru
let SERVER_SYNC_ENABLED = true;

// قائمة البيانات التي تُزامن مع الخادم
const SYNCED_COLLECTIONS = [
    'categories',
    'authors',
    'books',
    'reviews',
    'coupons',
    'banners',
    'orders',
    'other_products'
];

// ============================================
// جلب البيانات من الخادم وتحديث localStorage
// ============================================
async function syncFromServer() {
    if (!SERVER_SYNC_ENABLED) {
        console.log('Server sync is disabled. Using localStorage only.');
        return false;
    }

    console.log('🔄 Syncing data from server...');
    
    try {
        // التحقق من أن الخادم متاح
        const response = await fetch('/api/all');
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const serverData = await response.json();
        
        // تحديث localStorage بالبيانات من الخادم
        if (serverData.categories) {
            localStorage.setItem('rawqan_categories', JSON.stringify(serverData.categories));
            console.log('📚 Categories synced:', serverData.categories.length);
        }
        if (serverData.authors) {
            localStorage.setItem('rawqan_authors', JSON.stringify(serverData.authors));
            console.log('✍️ Authors synced:', serverData.authors.length);
        }
        if (serverData.books) {
            localStorage.setItem('rawqan_books', JSON.stringify(serverData.books));
            console.log('📖 Books synced:', serverData.books.length);
        }
        if (serverData.reviews) {
            localStorage.setItem('rawqan_reviews', JSON.stringify(serverData.reviews));
            console.log('⭐ Reviews synced:', serverData.reviews.length);
        }
        if (serverData.coupons) {
            localStorage.setItem('rawqan_coupons', JSON.stringify(serverData.coupons));
            console.log('🎟️ Coupons synced:', serverData.coupons.length);
        }
        if (serverData.banners) {
            localStorage.setItem('rawqan_banners', JSON.stringify(serverData.banners));
            console.log('🖼️ Banners synced:', serverData.banners.length);
        }
        if (serverData.orders) {
            localStorage.setItem('rawqan_orders', JSON.stringify(serverData.orders));
            console.log('📦 Orders synced:', serverData.orders.length);
        }
        if (serverData.otherProducts) {
            localStorage.setItem('rawqan_other_products', JSON.stringify(serverData.otherProducts));
            console.log('🛍️ Other products synced:', serverData.otherProducts.length);
        }
        
        console.log('✅ All data synced successfully from server!');
        return true;
        
    } catch (error) {
        console.warn('⚠️ Server sync failed:', error.message);
        console.log('Using localStorage as fallback...');
        
        // عرض رسالة للمستخدم إذا كان في لوحة الإدارة
        const isAdmin = localStorage.getItem('rawqan_admin') === 'true';
        if (isAdmin) {
            console.warn('⚠️ Running in OFFLINE mode. Changes will NOT sync to other devices.');
        }
        
        return false;
    }
}

// ============================================
// رفع البيانات إلى الخادم عند إجراء تغيير
// ============================================
async function syncToServer(collection, action, data) {
    if (!SERVER_SYNC_ENABLED) return false;

    console.log(`🔄 Syncing to server: ${collection} - ${action}`);
    
    // تعيين نقاط النهاية API بناءً على نوع البيانات
    const endpointMap = {
        'categories': '/api/categories',
        'authors': '/api/authors',
        'books': '/api/books',
        'coupons': '/api/coupons',
        'banners': '/api/banners',
        'orders': '/api/orders',
        'other_products': '/api/other-products'
    };
    
    // تقييمات القراء للقراءة فقط
    if (collection === 'reviews') {
        console.log('Reviews are read-only from server.');
        return true;
    }
    
    const endpoint = endpointMap[collection];
    if (!endpoint) {
        console.log('No API endpoint for:', collection);
        return false;
    }
    
    try {
        let url = endpoint;
        let method = 'GET';
        let body = null;
        
        switch(action) {
            case 'add':
                method = 'POST';
                body = JSON.stringify(data);
                break;
            case 'update':
                method = 'PUT';
                url = `${endpoint}/${data.id}`;
                body = JSON.stringify(data);
                break;
            case 'delete':
                method = 'DELETE';
                url = `${endpoint}/${data.id}`;
                break;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        console.log(`✅ Synced ${collection} to server successfully!`);
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to sync ${collection} to server:`, error);
        
        // عرض رسالة خطأ للمستخدم
        const isAdmin = localStorage.getItem('rawqan_admin') === 'true';
        if (isAdmin) {
            alert(`تنبيه: لم يتم تحديث الخادم!\nالخادم غير متصل أو هناك خطأ.\nالتغييرات حفظت محلياً في هذا الجهاز فقط.`);
        }
        
        return false;
    }
}

// ============================================
// دالة مساعدة لتحديد ما إذا كان يتعين مزامنة البيانات
// ============================================
function needsServerSync(key) {
    return SYNCED_COLLECTIONS.includes(key);
}

// ============================================
// GLOBAL STATE
// ============================================

const CURRENCY_RATE = 140; // 1 SAR = 140 YER
let currentCurrency = localStorage.getItem('rawqan_currency') || 'SAR';
let currentDetailBookId = null;
let currentBannerIndex = 0;
let bannerInterval = null;
let appliedCoupon = null;
let appliedDiscount = 0;

// ============================================
// DEFAULT DATA
// ============================================

const defaultCategories = [
    { id: 1, name: 'روايات و أدب', icon: 'book-open', color: '#D4AF37' },
    { id: 2, name: 'تنمية ذاتية', icon: 'brain', color: '#F4E4BC' },
    { id: 3, name: 'تاريخ', icon: 'landmark', color: '#B8960C' },
    { id: 4, name: 'علوم', icon: 'flask', color: '#D4AF37' },
    { id: 5, name: 'دين', icon: 'kaaba', color: '#F4E4BC' },
    { id: 6, name: 'أطفال', icon: 'child-reaching', color: '#D4AF37' },
    { id: 7, name: 'شعر', icon: 'feather', color: '#B8960C' },
    { id: 8, name: 'أعمال و إدارة', icon: 'briefcase', color: '#F4E4BC' }
];

const defaultAuthors = [
    { id: 1, name: 'غسان كنفاني', bio: 'أديب وفيلسوف فلسطيني، يعتبر من أهم الأدباء العرب في القرن العشرين.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
    { id: 2, name: 'نجيب محفوظ', bio: 'الأديب المصري الحاصل على جائزة نوبل في الآداب، مؤلف العديد من الروايات الكلاسيكية.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
    { id: 3, name: 'طارق الحبيب', bio: 'طبيب ومحاضر وكاتب سعودي متخصص في التنمية البشرية والعلاقات الأسرية.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop' },
    { id: 4, name: 'محمد الغزالي', bio: 'عالم دين مصري بارز، عضو الإمام الأعز، له العديد من المؤلفات في الفكر الإسلامي.', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop' },
    { id: 5, name: 'أحمد خالد توفيق', bio: 'كاتب ومترجم مصري، يُعرف بأدبه الخيالي والغموض، مؤلف سلسلة ما وراء الطبيعة.', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop' },
    { id: 6, name: 'إحسان عبد القدوس', bio: 'صحفي وكاتب مصري، يُعرف برواياته الرومانسية وطبيبته الاجتماعية.', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
    { id: 7, name: 'يوسف السباعي', bio: 'أديب وصحفي مصري، كان وزيراً للثقافة، له العديد من الروايات والمسرحيات.', image: 'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=200&h=200&fit=crop' },
    { id: 8, name: 'عبد الرحمن منيف', bio: 'روائي سعودي، مؤلف سلسلة مدن الملح التي تصور الحياة في الخليج.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' }
];

const defaultBooks = [
    { id: 1, title: 'الصيد', authorId: 1, categoryId: 1, price: 45, pages: 280, rating: 4.5, description: 'رواية رائدة من أدب المقاومة، تدور أحداثها في فلسطين المحتلة. تعتبر هذه الرواية من أهم أعمال غسان كنفاني التي تناولت قضية فلسطين بعمق.', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 2, title: 'رجال في الشمس', authorId: 1, categoryId: 1, price: 38, pages: 220, rating: 4.8, description: 'رواية كلاسيكية تتناول قضية اللاجئين الفلسطينيين وسعيهم للبحث عن حياة أفضل.', image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop', bestSeller: true, rawqan: false },
    { id: 3, title: 'بين القصرين', authorId: 2, categoryId: 1, price: 55, pages: 350, rating: 5, description: 'الجزء الأول من ثلاثية القاهرة لنجيب محفوظ، تصور الحياة في مصر القديمة عبر عائلة عبد الجواد.', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 4, title: 'قصر الشوق', authorId: 2, categoryId: 1, price: 55, pages: 400, rating: 4.8, description: 'الجزء الثاني من ثلاثية القاهرة، يواصل حكاية عائلة عبد الجواد عبر جيل جديد.', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop', bestSeller: true, rawqan: false },
    { id: 5, title: 'السكر', authorId: 2, categoryId: 1, price: 55, pages: 380, rating: 4.7, description: 'الجزء الأخير من ثلاثية القاهرة، يختتم سيرة العائلة عبر أجيال متعاقبة.', image: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&h=600&fit=crop', bestSeller: false, rawqan: false },
    { id: 6, title: 'لا تحزن', authorId: 3, categoryId: 2, price: 35, pages: 200, rating: 4.9, description: 'كتاب ملهم يساعدك على التغلب على القلق والضغوط الحياتية بطرق عملية ومبنية على العلم.', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 7, title: 'كفاية', authorId: 3, categoryId: 2, price: 42, pages: 240, rating: 4.6, description: 'دليل عملي للوصول إلى الرضا النفسي والابتعاد عن التهالم والمقارنة مع الآخرين.', image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 8, title: 'عقود الذهب', authorId: 4, categoryId: 5, price: 60, pages: 320, rating: 4.8, description: 'تفسير عميق لمعنى العبادة في الإسلام وآثارها على الحياة اليومية.', image: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400&h=600&fit=crop', bestSeller: true, rawqan: false },
    { id: 9, title: 'فكر الإسلامي', authorId: 4, categoryId: 5, price: 48, pages: 290, rating: 4.5, description: 'نظرة شاملة على الفكر الإسلامي من منظور معاصر يلامس الواقع.', image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop', bestSeller: false, rawqan: false },
    { id: 10, title: 'ما وراء الطبيعة', authorId: 5, categoryId: 1, price: 32, pages: 180, rating: 4.7, description: 'الحلقة الأولى من سلسلة ما وراء الطبيعة الشهيرة التي أبهرت الملايين.', image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 11, title: 'ألف ليلة وليلة', authorId: 6, categoryId: 1, price: 75, pages: 500, rating: 5, description: 'مجموعة الحكايات الشعبية العربية الشهيرة في طبعة كاملة ومُنقحة.', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 12, title: 'عالم الجسيمات', authorId: 1, categoryId: 4, price: 58, pages: 260, rating: 4.4, description: 'مقدمة ممتعة لعالم الفيزياء الكمية والجسيمات الأولية للجميع.', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=600&fit=crop', bestSeller: false, rawqan: false },
    { id: 13, title: 'تاريخ العرب', authorId: 2, categoryId: 3, price: 85, pages: 450, rating: 4.9, description: 'دراسة شاملة لتاريخ الحضارة العربية من الجاهلية حتى العصر الحديث.', image: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=600&fit=crop', bestSeller: true, rawqan: true },
    { id: 14, title: 'قصص للأطفال', authorId: 3, categoryId: 6, price: 28, pages: 120, rating: 4.6, description: 'مجموعة من القصص التعليمية والترفيهية للأطفال بأسلوب جميل.', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop', bestSeller: false, rawqan: false },
    { id: 15, title: 'ديوان الحداد', authorId: 1, categoryId: 7, price: 40, pages: 150, rating: 4.5, description: 'مجموعة شعرية مؤثرة من أشعار الحداد باللغة العربية الفصحى.', image: 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400&h=600&fit=crop', bestSeller: false, rawqan: false },
    { id: 16, title: 'فن الإدارة', authorId: 6, categoryId: 8, price: 65, pages: 300, rating: 4.7, description: 'دليل شامل لإدارة الأعمال والمشاريع بأساليب حديثة.', image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=600&fit=crop', bestSeller: true, rawqan: false },
    { id: 17, title: 'الثورة الكبرى', authorId: 7, categoryId: 3, price: 52, pages: 280, rating: 4.6, description: 'رواية تاريخية تصور أحداث الثورة المصرية الكبرى بعمق.', image: 'https://images.unsplash.com/photo-1473172707857-f9e276582ab6?w=400&h=600&fit=crop', bestSeller: false, rawqan: true },
    { id: 18, title: 'مدن الملح', authorId: 8, categoryId: 1, price: 70, pages: 420, rating: 4.8, description: 'الجزء الأول من سلسلة مدن الملح الشهيرة التي تصور الحياة في الخليج.', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=600&fit=crop', bestSeller: true, rawqan: true }
];

const defaultReviews = [
    { id: 1, name: 'أحمد محمد', text: 'متجر رائع جداً، الكتب أصلية والتوصيل سريع. أنصح به بشدة!', rating: 5 },
    { id: 2, name: 'فاطمة علي', text: 'تشكيلة مذهلة من الكتب العربية والعالمية. تجربة تسوق رائعة.', rating: 5 },
    { id: 3, name: 'محمد سعيد', text: 'التصميم جميل جداً والخدمة ممتازة. سأعود للتسوق هنا حتماً.', rating: 4 },
    { id: 4, name: 'نورة خالد', text: 'أفضل متجر كتب إلكتروني جربته. الكتب أصلية والأسعار مناسبة.', rating: 5 },
    { id: 5, name: 'عبدالله يوسف', text: 'مجموعة رائعة من الروايات الكلاسيكية. اشتريت أكثر من 10 كتاب.', rating: 5 },
    { id: 6, name: 'سارة أحمد', text: 'التوصيل كان أسرع مما توقعت. الكتب بحالة ممتازة.', rating: 4 }
];

const defaultCoupons = [
    { id: 1, code: 'WELCOME10', discount: 10, minOrder: 100, expiry: null, active: true },
    { id: 2, code: 'SAVE20', discount: 20, minOrder: 200, expiry: '2026-12-31', active: true }
];

const defaultBanners = [
    { id: 1, title: 'خصم 30% على مجموعة روايات مايو', subtitle: 'عرض خاص', tag: 'عرض خاص', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&q=80', link: 'categories' },
    { id: 2, title: 'وصلنا إصدارات شهر مايو الجديدة', subtitle: 'جديد', tag: 'جديد', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1600&q=80', link: 'rawqan' },
    { id: 3, title: 'الشحن مجاني للطلبات فوق 200 ريال', subtitle: 'مجاني', tag: 'مجاني', image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80', link: 'categories' }
];

// ============================================
// STORAGE
// ============================================

function initStorage() {
    if (!localStorage.getItem('rawqan_categories')) {
        localStorage.setItem('rawqan_categories', JSON.stringify(defaultCategories));
    }
    if (!localStorage.getItem('rawqan_authors')) {
        localStorage.setItem('rawqan_authors', JSON.stringify(defaultAuthors));
    }
    if (!localStorage.getItem('rawqan_books')) {
        localStorage.setItem('rawqan_books', JSON.stringify(defaultBooks));
    }
    if (!localStorage.getItem('rawqan_reviews')) {
        localStorage.setItem('rawqan_reviews', JSON.stringify(defaultReviews));
    }
    if (!localStorage.getItem('rawqan_coupons')) {
        localStorage.setItem('rawqan_coupons', JSON.stringify(defaultCoupons));
    }
    if (!localStorage.getItem('rawqan_banners')) {
        localStorage.setItem('rawqan_banners', JSON.stringify(defaultBanners));
    }
    if (!localStorage.getItem('rawqan_orders')) {
        localStorage.setItem('rawqan_orders', JSON.stringify([]));
    }
    if (!localStorage.getItem('rawqan_cart')) {
        localStorage.setItem('rawqan_cart', JSON.stringify([]));
    }
    if (!localStorage.getItem('rawqan_admin')) {
        localStorage.setItem('rawqan_admin', 'false');
    }
    if (!localStorage.getItem('rawqan_other_products')) {
        localStorage.setItem('rawqan_other_products', JSON.stringify([]));
    }
}

function getStorage(key) {
    return JSON.parse(localStorage.getItem(`rawqan_${key}`) || '[]');
}

function setStorage(key, data) {
    localStorage.setItem(`rawqan_${key}`, JSON.stringify(data));
}

// ============================================
// CURRENCY
// ============================================

function formatPrice(priceSAR) {
    if (currentCurrency === 'SAR') {
        return `${priceSAR.toFixed(2)} ر.س`;
    } else {
        const priceYER = priceSAR * CURRENCY_RATE;
        return `${Math.round(priceYER).toLocaleString()} ر.ي`;
    }
}

function setCurrency(currency) {
    currentCurrency = currency;
    localStorage.setItem('rawqan_currency', currency);
    
    document.getElementById('sarBtn')?.classList.toggle('active', currency === 'SAR');
    document.getElementById('yerBtn')?.classList.toggle('active', currency === 'YER');
    
    loadCurrentPage();
}

// ============================================
// RIPPLE EFFECT
// ============================================

function createRipple(e) {
    const container = document.getElementById('rippleContainer');
    if (!container) return;
    
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    
    container.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 800);
}

// ============================================
// MAGNETIC EFFECT
// ============================================

function initMagnetic() {
    const magnetics = document.querySelectorAll('.btn-liquid-gold, .header-icon, .menu-trigger, .category-card-liquid, .book-card, .premium-book-card');
    
    magnetics.forEach(el => {
        el.classList.add('magnetic');
        
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            el.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
        });
    });
}

// ============================================
// HEADER SCROLL
// ============================================

function initHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ============================================
// SIDE MENU
// ============================================

function openSideMenu() {
    document.getElementById('sideMenu')?.classList.add('active');
    document.getElementById('sideMenuOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSideMenu() {
    document.getElementById('sideMenu')?.classList.remove('active');
    document.getElementById('sideMenuOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    closeSideMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    loadPageContent(pageName);
}

function loadPageContent(pageName) {
    switch(pageName) {
        case 'home':
            loadHomePage();
            startBannerCarousel();
            break;
        case 'categories':
            loadCategoriesPage();
            break;
        case 'authors':
            loadAuthorsPage();
            break;
        case 'rawqan':
            loadRawqanPage();
            break;
        case 'cart':
            loadCartPage();
            break;
        case 'track':
            loadTrackPage();
            break;
        case 'admin':
            loadAdminPage();
            break;
    }
    
    initMagnetic();
}

function loadCurrentPage() {
    const activePage = document.querySelector('.page-section.active');
    if (activePage) {
        const pageName = activePage.id.replace('Page', '');
        loadPageContent(pageName);
    }
}

// ============================================
// HOME PAGE
// ============================================

function loadHomePage() {
    renderDynamicBanners();
    loadAuthorsFlow();
    loadRawqanCollection();
    loadBestSellers();
    loadHomeCategories();
    loadReviewsFlow();
    updateCartCount();
}

function loadAuthorsFlow() {
    const authors = getStorage('authors');
    const track = document.getElementById('authorsFlowTrack');
    if (!track) return;
    
    // Duplicate authors for infinite scroll effect
    const items = [...authors, ...authors].map(author => {
        const bookCount = getStorage('books').filter(b => b.authorId === author.id).length;
        return `
            <div class="flow-card" onclick="showAuthorDetail(${author.id})">
                <img src="${author.image}" alt="${author.name}" class="flow-card-image" onerror="this.src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'">
                <div class="flow-card-info">
                    <h4 class="flow-card-name">${author.name}</h4>
                    <span class="flow-card-count">${bookCount} كتاب</span>
                </div>
            </div>
        `;
    }).join('');
    
    track.innerHTML = items;
}

function loadRawqanCollection() {
    const books = getStorage('books').filter(b => b.rawqan);
    const track = document.getElementById('rawqanTrack');
    if (!track) return;
    
    const authors = getStorage('authors');
    
    track.innerHTML = books.map(book => {
        const author = authors.find(a => a.id === book.authorId);
        return `
            <div class="premium-book-card" onclick="showBookDetail(${book.id})">
                <img src="${book.image}" alt="${book.title}" class="premium-book-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                <div class="premium-book-info">
                    <h4 class="premium-book-title">${book.title}</h4>
                    <p class="premium-book-author">${author?.name || ''}</p>
                    <div class="premium-book-bottom">
                        <span class="premium-book-price">${formatPrice(book.price)}</span>
                        <button class="premium-book-cart" onclick="event.stopPropagation(); addToCart(${book.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadBestSellers() {
    const books = getStorage('books').filter(b => b.bestSeller);
    const track = document.getElementById('bestsellersTrack');
    if (!track) return;
    
    const authors = getStorage('authors');
    
    // Duplicate for infinite scroll
    const items = [...books, ...books].map((book, index) => {
        const author = authors.find(a => a.id === book.authorId);
        return `
            <div class="bestseller-card" data-rank="${index % books.length + 1}" onclick="showBookDetail(${book.id})">
                <img src="${book.image}" alt="${book.title}" class="bestseller-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                <h4 class="bestseller-title">${book.title}</h4>
                <span class="bestseller-price">${formatPrice(book.price)}</span>
            </div>
        `;
    }).join('');
    
    track.innerHTML = items;
}

function loadHomeCategories() {
    const categories = getStorage('categories').slice(0, 5);
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    const books = getStorage('books');
    
    grid.innerHTML = categories.map(cat => {
        const count = books.filter(b => b.categoryId === cat.id).length;
        return `
            <div class="category-card-liquid" onclick="showCategoryDetail(${cat.id})">
                <div class="category-card-icon">
                    <i class="fas fa-${cat.icon}"></i>
                </div>
                <h4 class="category-card-name">${cat.name}</h4>
                <span class="category-card-count">${count} كتاب</span>
            </div>
        `;
    }).join('');
}

function loadReviewsFlow() {
    const reviews = getStorage('reviews');
    const track = document.getElementById('reviewsTrack');
    if (!track) return;
    
    // Duplicate for infinite scroll
    const items = [...reviews, ...reviews].map(review => `
        <div class="review-card">
            <div class="review-stars">
                ${Array(5).fill(0).map((_, i) => `<i class="fas fa-star"></i>`).join('')}
            </div>
            <p class="review-text">"${review.text}"</p>
            <div class="review-author">
                <div class="review-avatar">
                    ${review.name.charAt(0)}
                </div>
                <div>
                    <p class="review-name">${review.name}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    track.innerHTML = items;
}

// ============================================
// BANNER CAROUSEL (Dynamic from localStorage)
// ============================================

function renderDynamicBanners() {
    const banners = getStorage('banners');
    const carousel = document.getElementById('bannerCarousel');
    const indicators = document.getElementById('bannerIndicators');
    
    if (!carousel || banners.length === 0) return;
    
    // Render banner items
    carousel.innerHTML = banners.map((banner, index) => `
        <div class="banner-item ${index === 0 ? 'active' : ''}" data-banner="${index}">
            <img src="${banner.image}" alt="${banner.title}" class="banner-image" onerror="this.src='https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&q=80'">
            <div class="banner-content">
                <span class="banner-tag">${banner.tag || 'عرض خاص'}</span>
                <h3 class="banner-title">${banner.title}</h3>
                <button class="banner-btn" onclick="showPage('${banner.link || 'categories'}')">استكشف الآن</button>
            </div>
        </div>
    `).join('');
    
    // Render indicators
    if (indicators) {
        indicators.innerHTML = banners.map((_, index) => `
            <button class="banner-dot ${index === 0 ? 'active' : ''}" onclick="goToBanner(${index})"></button>
        `).join('');
    }
    
    currentBannerIndex = 0;
}

function startBannerCarousel() {
    if (bannerInterval) clearInterval(bannerInterval);
    
    const banners = getStorage('banners');
    const count = banners.length || 3;
    
    if (count === 0) return;
    
    bannerInterval = setInterval(() => {
        currentBannerIndex = (currentBannerIndex + 1) % count;
        goToBanner(currentBannerIndex);
    }, 5000);
}

function goToBanner(index) {
    currentBannerIndex = index;
    
    const banners = document.querySelectorAll('.banner-item');
    const dots = document.querySelectorAll('.banner-dot');
    
    banners.forEach((b, i) => {
        b.classList.toggle('active', i === index);
    });
    
    dots.forEach((d, i) => {
        d.classList.toggle('active', i === index);
    });
}

// ============================================
// CATEGORIES PAGE
// ============================================

function loadCategoriesPage() {
    const categories = getStorage('categories');
    const grid = document.getElementById('categoriesGridFull');
    if (!grid) return;
    
    const books = getStorage('books');
    
    grid.innerHTML = categories.map(cat => {
        const count = books.filter(b => b.categoryId === cat.id).length;
        return `
            <div class="category-card-liquid" onclick="showCategoryDetail(${cat.id})">
                <div class="category-card-icon">
                    <i class="fas fa-${cat.icon}"></i>
                </div>
                <h4 class="category-card-name">${cat.name}</h4>
                <span class="category-card-count">${count} كتاب</span>
            </div>
        `;
    }).join('');
}

function showCategoryDetail(categoryId) {
    const categories = getStorage('categories');
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const books = getStorage('books').filter(b => b.categoryId === categoryId);
    const authors = getStorage('authors');
    
    showPage('categories');
    
    // Hide grid, show detail
    document.getElementById('categoriesGridFull')?.parentElement?.classList.add('hidden');
    
    // Create category detail view
    let detailContainer = document.getElementById('categoryDetailContainer');
    if (!detailContainer) {
        detailContainer = document.createElement('div');
        detailContainer.id = 'categoryDetailContainer';
        detailContainer.className = 'page-content';
        document.getElementById('categoriesPage')?.appendChild(detailContainer);
    }
    
    // Get 3 books for banner
    const bannerBooks = books.slice(0, 3);
    
    detailContainer.innerHTML = `
        <div class="page-cinematic-header" style="margin: -24px -24px 40px; height: 350px;">
            <div class="page-header-bg has-images" style="display: grid; grid-template-columns: repeat(3, 1fr); height: 100%;">
                ${bannerBooks.map(b => `<img src="${b.image}" alt="" class="category-banner-img" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.4);">`).join('')}
            </div>
            <div class="page-header-overlay"></div>
            <div class="page-header-content">
                <button onclick="backToCategoriesGrid()" class="back-btn-liquid" style="position: absolute; top: 80px; right: 24px;">
                    <i class="fas fa-arrow-right"></i>
                </button>
                <h1 class="page-header-title">${category.name}</h1>
                <p class="page-header-subtitle">${books.length} كتاب متاح</p>
            </div>
        </div>
        <div class="books-grid">
            ${books.length > 0 ? books.map(book => {
                const author = authors.find(a => a.id === book.authorId);
                return `
                    <div class="book-card" onclick="showBookDetail(${book.id})">
                        <img src="${book.image}" alt="${book.title}" class="book-card-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                        <div class="book-card-overlay">
                            <button class="btn-liquid-gold" style="width: 100%; padding: 12px;" onclick="event.stopPropagation(); addToCart(${book.id})">
                                <i class="fas fa-cart-plus ml-1"></i>أضف للسلة
                            </button>
                        </div>
                        <div class="book-card-content">
                            <h4 class="book-card-title">${book.title}</h4>
                            <p class="book-card-author">${author?.name || ''}</p>
                            <div class="book-card-bottom">
                                <span class="book-card-price">${formatPrice(book.price)}</span>
                                <span class="book-card-rating"><i class="fas fa-star"></i> ${book.rating || 4}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') : '<p style="text-align: center; color: var(--white-muted); grid-column: 1/-1; padding: 40px;">لا توجد كتب في هذه الفئة بعد</p>'}
        </div>
    `;
    
    detailContainer.classList.remove('hidden');
    initMagnetic();
}

function backToCategoriesGrid() {
    document.getElementById('categoriesGridFull')?.parentElement?.classList.remove('hidden');
    document.getElementById('categoryDetailContainer')?.classList.add('hidden');
}

// ============================================
// AUTHORS PAGE
// ============================================

function loadAuthorsPage() {
    const authors = getStorage('authors');
    const grid = document.getElementById('authorsPageGrid');
    if (!grid) return;
    
    const books = getStorage('books');
    
    grid.innerHTML = authors.map(author => {
        const count = books.filter(b => b.authorId === author.id).length;
        return `
            <div class="author-page-card" onclick="showAuthorDetail(${author.id})">
                <img src="${author.image}" alt="${author.name}" class="author-page-image" onerror="this.src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'">
                <div class="author-page-info">
                    <h4 class="author-page-name">${author.name}</h4>
                    <p class="author-page-bio">${author.bio}</p>
                    <span class="author-page-count"><i class="fas fa-book ml-1"></i>${count} كتاب</span>
                </div>
            </div>
        `;
    }).join('');
}

function showAuthorDetail(authorId) {
    const authors = getStorage('authors');
    const author = authors.find(a => a.id === authorId);
    if (!author) return;
    
    const books = getStorage('books').filter(b => b.authorId === authorId);
    const categories = getStorage('categories');
    
    showPage('authors');
    
    // Create detail view
    let detailContainer = document.getElementById('authorDetailContainer');
    if (!detailContainer) {
        detailContainer = document.createElement('div');
        detailContainer.id = 'authorDetailContainer';
        document.getElementById('authorsPage')?.appendChild(detailContainer);
    }
    
    document.getElementById('authorsPageGrid')?.classList.add('hidden');
    
    detailContainer.innerHTML = `
        <div class="author-detail-header" style="margin: -24px -24px 40px; height: 400px;">
            <div class="author-hero-bg">
                <img src="${author.image}" alt="" class="author-hero-image" onerror="this.src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop'">
                <div class="author-hero-overlay"></div>
            </div>
            <div class="author-hero-content" style="position: absolute; bottom: 40px; right: 40px; left: 40px;">
                <button onclick="backToAuthorsGrid()" class="back-btn-liquid" style="position: absolute; top: -80px; right: 0;">
                    <i class="fas fa-arrow-right"></i>
                </button>
                <h2 class="author-name">${author.name}</h2>
                <p class="author-bio">${author.bio}</p>
            </div>
        </div>
        <div class="section-header-minimal" style="padding: 0 24px 20px;">
            <h2 class="section-title-gold">كتب ${author.name}</h2>
        </div>
        <div class="books-grid">
            ${books.length > 0 ? books.map(book => {
                const cat = categories.find(c => c.id === book.categoryId);
                return `
                    <div class="book-card" onclick="showBookDetail(${book.id})">
                        <img src="${book.image}" alt="${book.title}" class="book-card-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                        <div class="book-card-overlay">
                            <button class="btn-liquid-gold" style="width: 100%; padding: 12px;" onclick="event.stopPropagation(); addToCart(${book.id})">
                                <i class="fas fa-cart-plus ml-1"></i>أضف للسلة
                            </button>
                        </div>
                        <div class="book-card-content">
                            <h4 class="book-card-title">${book.title}</h4>
                            <p class="book-card-author">${cat?.name || ''}</p>
                            <div class="book-card-bottom">
                                <span class="book-card-price">${formatPrice(book.price)}</span>
                                <span class="book-card-rating"><i class="fas fa-star"></i> ${book.rating || 4}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') : '<p style="text-align: center; color: var(--white-muted); grid-column: 1/-1; padding: 40px;">لا توجد كتب لهذا المؤلف بعد</p>'}
        </div>
    `;
    
    detailContainer.classList.remove('hidden');
    initMagnetic();
}

function backToAuthorsGrid() {
    document.getElementById('authorsPageGrid')?.classList.remove('hidden');
    document.getElementById('authorDetailContainer')?.classList.add('hidden');
}

// ============================================
// RAWQAN COLLECTION PAGE
// ============================================

function loadRawqanPage() {
    const books = getStorage('books').filter(b => b.rawqan);
    const grid = document.getElementById('rawqanBooksGrid');
    if (!grid) return;
    
    const authors = getStorage('authors');
    
    grid.innerHTML = books.map(book => {
        const author = authors.find(a => a.id === book.authorId);
        return `
            <div class="book-card" onclick="showBookDetail(${book.id})">
                <img src="${book.image}" alt="${book.title}" class="book-card-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                <div class="book-card-overlay">
                    <button class="btn-liquid-gold" style="width: 100%; padding: 12px;" onclick="event.stopPropagation(); addToCart(${book.id})">
                        <i class="fas fa-cart-plus ml-1"></i>أضف للسلة
                    </button>
                </div>
                <div class="book-card-content">
                    <h4 class="book-card-title">${book.title}</h4>
                    <p class="book-card-author">${author?.name || ''}</p>
                    <div class="book-card-bottom">
                        <span class="book-card-price">${formatPrice(book.price)}</span>
                        <span class="book-card-rating"><i class="fas fa-star"></i> ${book.rating || 4}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// BOOK DETAIL
// ============================================

function showBookDetail(bookId) {
    const books = getStorage('books');
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    currentDetailBookId = bookId;
    
    const authors = getStorage('authors');
    const categories = getStorage('categories');
    
    const author = authors.find(a => a.id === book.authorId);
    const category = categories.find(c => c.id === book.categoryId);
    
    document.getElementById('modalBookImage')?.setAttribute('src', book.image);
    document.getElementById('modalBookCategory').textContent = category?.name || '';
    document.getElementById('modalBookTitle').textContent = book.title;
    document.getElementById('modalBookAuthor').textContent = author?.name || '';
    document.getElementById('modalBookDescription').textContent = book.description || 'لا يوجد وصف متاح لهذا الكتاب.';
    document.getElementById('modalBookPages').textContent = book.pages ? `${book.pages} صفحة` : '';
    document.getElementById('modalBookPrice').textContent = formatPrice(book.price);
    document.getElementById('modalBookPriceYER').textContent = currentCurrency === 'SAR' ? 
        `${Math.round(book.price * CURRENCY_RATE).toLocaleString()} ر.ي` : 
        `${book.price.toFixed(2)} ر.س`;
    
    // Rating
    const ratingEl = document.getElementById('modalBookRating');
    if (ratingEl) {
        const stars = book.rating || 4;
        ratingEl.innerHTML = Array(5).fill(0).map((_, i) => 
            `<i class="fas fa-star${i < Math.floor(stars) ? '' : '-half-stroke'}"></i>`
        ).join('');
    }
    
    document.getElementById('bookDetailOverlay')?.classList.add('active');
    document.getElementById('bookDetailModal')?.classList.add('active');
}

function closeBookDetail() {
    document.getElementById('bookDetailOverlay')?.classList.remove('active');
    document.getElementById('bookDetailModal')?.classList.remove('active');
    currentDetailBookId = null;
}

// Add to cart from modal
function initModalAddToCart() {
    const modalBtn = document.getElementById('modalAddToCart');
    if (modalBtn) {
        modalBtn.onclick = () => {
            if (currentDetailBookId) {
                addToCart(currentDetailBookId);
                closeBookDetail();
            }
        };
    }
}

// ============================================
// CART
// ============================================

function addToCart(bookId) {
    const cart = getStorage('cart');
    const existingItem = cart.find(item => item.bookId === bookId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ bookId, quantity: 1 });
    }
    
    setStorage('cart', cart);
    updateCartCount();
    
    // Show subtle feedback
    showToast('تمت إضافة الكتاب للسلة');
}

function removeFromCart(bookId) {
    let cart = getStorage('cart');
    cart = cart.filter(item => item.bookId !== bookId);
    setStorage('cart', cart);
    loadCartPage();
    updateCartCount();
}

function updateCartQuantity(bookId, delta) {
    const cart = getStorage('cart');
    const item = cart.find(i => i.bookId === bookId);
    
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(bookId);
            return;
        }
        setStorage('cart', cart);
        loadCartPage();
        updateCartCount();
    }
}

function updateCartCount() {
    const cart = getStorage('cart');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = count;
}

function loadCartPage() {
    const cart = getStorage('cart');
    const books = getStorage('books');
    const authors = getStorage('authors');
    
    const emptyEl = document.getElementById('cartEmpty');
    const contentEl = document.getElementById('cartContent');
    
    if (cart.length === 0) {
        emptyEl?.classList.remove('hidden');
        contentEl?.classList.add('hidden');
        return;
    }
    
    emptyEl?.classList.add('hidden');
    contentEl?.classList.remove('hidden');
    
    let subtotal = 0;
    const itemsEl = document.getElementById('cartItems');
    
    if (itemsEl) {
        itemsEl.innerHTML = cart.map(item => {
            const book = books.find(b => b.id === item.bookId);
            if (!book) return '';
            
            const author = authors.find(a => a.id === book.authorId);
            const itemTotal = book.price * item.quantity;
            subtotal += itemTotal;
            
            return `
                <div class="cart-item">
                    <img src="${book.image}" alt="${book.title}" class="cart-item-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${book.title}</h4>
                        <p class="cart-item-author">${author?.name || ''}</p>
                        <span class="cart-item-price">${formatPrice(book.price)}</span>
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-item-qty">
                            <button onclick="updateCartQuantity(${book.id}, 1)">+</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartQuantity(${book.id}, -1)">-</button>
                        </div>
                        <button onclick="removeFromCart(${book.id})" class="cart-item-remove">
                            <i class="fas fa-trash ml-1"></i>حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ============================================
// CHECKOUT
// ============================================

function openCheckout() {
    const cart = getStorage('cart');
    if (cart.length === 0) {
        showToast('السلة فارغة');
        return;
    }
    
    // Reset coupon
    appliedCoupon = null;
    appliedDiscount = 0;
    document.getElementById('couponFeedback')?.classList.add('hidden');
    document.getElementById('checkoutCoupon').value = '';
    document.getElementById('discountRow')?.style.setProperty('display', 'none');
    
    // Payment method handlers
    document.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener('change', (e) => {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
            e.target.closest('.payment-option').classList.add('active');
            
            const refGroup = document.getElementById('transferRefGroup');
            if (refGroup) {
                refGroup.style.display = e.target.value === 'transfer' ? 'block' : 'none';
            }
        });
    });
    
    updateCheckoutSummary();
    
    document.getElementById('checkoutOverlay')?.classList.add('active');
    document.getElementById('checkoutModal')?.classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutOverlay')?.classList.remove('active');
    document.getElementById('checkoutModal')?.classList.remove('active');
}

function updateCheckoutSummary() {
    const cart = getStorage('cart');
    const books = getStorage('books');
    
    let subtotal = 0;
    cart.forEach(item => {
        const book = books.find(b => b.id === item.bookId);
        if (book) subtotal += book.price * item.quantity;
    });
    
    const shipping = subtotal >= 200 ? 0 : 25;
    let discount = 0;
    
    if (appliedCoupon) {
        discount = (subtotal * appliedDiscount) / 100;
    }
    
    const total = subtotal - discount + shipping;
    
    document.getElementById('checkoutSubtotal').textContent = formatPrice(subtotal);
    document.getElementById('checkoutShipping').textContent = shipping === 0 ? 'مجاني' : formatPrice(shipping);
    
    if (appliedCoupon) {
        document.getElementById('discountRow')?.style.setProperty('display', 'flex');
        document.getElementById('checkoutDiscount').textContent = `-${formatPrice(discount)}`;
    }
    
    document.getElementById('checkoutTotal').textContent = formatPrice(total);
}

function applyCoupon() {
    const code = document.getElementById('checkoutCoupon')?.value.trim().toUpperCase();
    const feedback = document.getElementById('couponFeedback');
    
    if (!code) {
        showCouponFeedback('الرجاء إدخال كود الكوبون', 'error');
        return;
    }
    
    const coupons = getStorage('coupons');
    const coupon = coupons.find(c => c.code.toUpperCase() === code && c.active);
    
    if (!coupon) {
        showCouponFeedback('كود الكوبون غير صحيح أو منتهي', 'error');
        return;
    }
    
    // Check minimum order
    const cart = getStorage('cart');
    const books = getStorage('books');
    let subtotal = 0;
    cart.forEach(item => {
        const book = books.find(b => b.id === item.bookId);
        if (book) subtotal += book.price * item.quantity;
    });
    
    if (coupon.minOrder && subtotal < coupon.minOrder) {
        showCouponFeedback(`الحد الأدنى للطلب: ${formatPrice(coupon.minOrder)}`, 'error');
        return;
    }
    
    appliedCoupon = coupon;
    appliedDiscount = coupon.discount;
    updateCheckoutSummary();
    showCouponFeedback(`تم تطبيق خصم ${coupon.discount}%`, 'success');
}

function showCouponFeedback(message, type) {
    const feedback = document.getElementById('couponFeedback');
    if (!feedback) return;
    
    feedback.textContent = message;
    feedback.className = `coupon-feedback ${type}`;
    feedback.classList.remove('hidden');
}

// Generate invoice ID (longer format)
function generateInvoiceId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random = (len) => {
        let result = '';
        for (let i = 0; i < len; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `RQN-${random(5)}-${random(6)}-${year}${month}${day}-${random(4)}`;
}

// Checkout form submission
function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('checkoutName')?.value;
            const phone = document.getElementById('checkoutPhone')?.value;
            const email = document.getElementById('checkoutEmail')?.value;
            const address = document.getElementById('checkoutAddress')?.value;
            const city = document.getElementById('checkoutCity')?.value;
            const zip = document.getElementById('checkoutZip')?.value;
            const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
            const paymentRef = document.getElementById('checkoutRef')?.value;
            
            const cart = getStorage('cart');
            const books = getStorage('books');
            
            // Calculate totals
            let subtotal = 0;
            const items = cart.map(item => {
                const book = books.find(b => b.id === item.bookId);
                if (!book) return null;
                subtotal += book.price * item.quantity;
                return {
                    bookId: item.bookId,
                    title: book.title,
                    price: book.price,
                    quantity: item.quantity
                };
            }).filter(Boolean);
            
            const shipping = subtotal >= 200 ? 0 : 25;
            let discount = 0;
            if (appliedCoupon) {
                discount = (subtotal * appliedDiscount) / 100;
            }
            const total = subtotal - discount + shipping;
            
            const order = {
                id: generateInvoiceId(),
                customerName: name,
                phone: phone,
                email: email,
                address: address,
                city: city,
                zip: zip,
                paymentMethod: paymentMethod,
                paymentRef: paymentRef,
                items: items,
                subtotal: subtotal,
                shipping: shipping,
                discount: discount,
                coupon: appliedCoupon?.code || null,
                total: total,
                currency: currentCurrency,
                status: 'pending',
                date: new Date().toISOString()
            };
            
            const orders = getStorage('orders');
            orders.unshift(order);
            setStorage('orders', orders);
            
            // Sync to server
            await syncToServer('orders', 'add', order);
            
            // Clear cart
            setStorage('cart', []);
            updateCartCount();
            
            // Close checkout modal
            closeCheckout();
            
            // Show success modal
            document.getElementById('successInvoice').textContent = order.id;
            document.getElementById('successOverlay')?.classList.add('active');
            document.getElementById('successModal')?.classList.add('active');
            
            // Reset form
            form.reset();
            appliedCoupon = null;
            appliedDiscount = 0;
        });
    }
}

function closeSuccess() {
    document.getElementById('successOverlay')?.classList.remove('active');
    document.getElementById('successModal')?.classList.remove('active');
    showPage('home');
}

// ============================================
// TRACK ORDER
// ============================================

function loadTrackPage() {
    // Nothing to preload
}

function trackOrder() {
    const invoiceId = document.getElementById('trackInvoice')?.value.trim().toUpperCase();
    if (!invoiceId) {
        showToast('الرجاء إدخال رقم الفاتورة');
        return;
    }
    
    const orders = getStorage('orders');
    const order = orders.find(o => o.id.toUpperCase() === invoiceId);
    
    if (!order) {
        showToast('الطلب غير موجود');
        return;
    }
    
    displayTrackResult(order);
}

function displayTrackResult(order) {
    const resultEl = document.getElementById('trackResult');
    if (!resultEl) return;
    
    resultEl.classList.remove('hidden');
    
    const statuses = [
        { key: 'pending', title: 'تم استلام الطلب', icon: 'clipboard-check' },
        { key: 'processing', title: 'جاري تجهيز الطلب', icon: 'box-packing' },
        { key: 'shipped', title: 'الطلب في الطريق', icon: 'truck' },
        { key: 'delivered', title: 'تم التسليم', icon: 'check-circle' }
    ];
    
    const currentIndex = statuses.findIndex(s => s.key === order.status);
    
    // Build timeline
    resultEl.innerHTML = `
        <div class="track-result-header">
            <div class="track-result-id">${order.id}</div>
            <div class="track-result-date">${new Date(order.date).toLocaleDateString('ar-SA')}</div>
            <span class="track-result-status status-${order.status}">${getStatusText(order.status)}</span>
        </div>
        <div class="track-timeline">
            ${statuses.map((step, index) => {
                let state = 'pending';
                if (index < currentIndex || order.status === 'delivered') state = 'completed';
                else if (index === currentIndex) state = 'active';
                
                return `
                    <div class="timeline-step">
                        <div class="timeline-dot ${state}"></div>
                        <div class="timeline-info">
                            <h4 class="timeline-title ${state}">${step.title}</h4>
                            <p class="timeline-date">
                                ${state === 'completed' || state === 'active' ? new Date(order.date).toLocaleDateString('ar-SA') : 'قريباً'}
                            </p>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getStatusText(status) {
    const texts = {
        'pending': 'قيد المراجعة',
        'processing': 'جاري التجهيز',
        'shipped': 'في الطريق',
        'delivered': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return texts[status] || status;
}

// ============================================
// WHATSAPP
// ============================================

function openWhatsApp() {
    const cart = getStorage('cart');
    const books = getStorage('books');
    
    let message = 'مرحباً! أريد الاستفسار عن:';
    
    if (cart.length > 0) {
        message += '\n\nالسلة:\n';
        cart.forEach(item => {
            const book = books.find(b => b.id === item.bookId);
            if (book) {
                message += `- ${book.title} × ${item.quantity}\n`;
            }
        });
    } else {
        message += '\n\nأريد المساعدة في اختيار كتب مناسبة.';
    }
    
    const phone = '966500000000'; // Replace with actual
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// ============================================
// ADMIN
// ============================================

function loadAdminPage() {
    const isAdmin = localStorage.getItem('rawqan_admin') === 'true';
    
    document.getElementById('adminLogin')?.classList.toggle('hidden', isAdmin);
    document.getElementById('adminDashboard')?.classList.toggle('hidden', !isAdmin);
    
    if (isAdmin) {
        loadAdminDashboard();
    }
}

function adminLogin() {
    const email = document.getElementById('adminEmail')?.value;
    const password = document.getElementById('adminPassword')?.value;
    
    if ((email === 'admin@rawqan.com' && password === 'admin123') || 
        (email === 'admin' && password === 'admin123') ||
        password === 'admin123') {
        localStorage.setItem('rawqan_admin', 'true');
        loadAdminPage();
        showToast('مرحباً بك في لوحة الإدارة');
    } else {
        showToast('بيانات الدخول غير صحيحة');
    }
}

function adminLogout() {
    localStorage.setItem('rawqan_admin', 'false');
    loadAdminPage();
    showPage('home');
    showToast('تم تسجيل الخروج');
}

function loadAdminDashboard() {
    const books = getStorage('books');
    const orders = getStorage('orders');
    const authors = getStorage('authors');
    
    document.getElementById('statBooks').textContent = books.length;
    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statAuthors').textContent = authors.length;
    
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('statRevenue').textContent = formatPrice(totalRevenue);
    
    adminTab('books');
}

function adminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(panel => panel.classList.add('hidden'));
    
    const tabs = document.querySelectorAll('.admin-tab');
    const tabMap = { 'books': 0, 'orders': 1, 'authors': 2, 'categories': 3, 'banners': 4, 'coupons': 5, 'other': 6 };
    if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');
    
    const panelId = `admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Panel`;
    document.getElementById(panelId)?.classList.remove('hidden');
    
    switch(tabName) {
        case 'books': loadAdminBooks(); break;
        case 'orders': loadAdminOrders(); break;
        case 'authors': loadAdminAuthors(); break;
        case 'categories': loadAdminCategories(); break;
        case 'banners': loadAdminBanners(); break;
        case 'coupons': loadAdminCoupons(); break;
        case 'other': loadAdminOther(); break;
    }
}

function loadAdminBooks() {
    const books = getStorage('books');
    const container = document.getElementById('adminBooksTable');
    if (!container) return;
    
    const authors = getStorage('authors');
    const categories = getStorage('categories');
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>الكتاب</th>
                    <th>الفئة</th>
                    <th>المؤلف</th>
                    <th>السعر</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${books.map(book => {
                    const author = authors.find(a => a.id === book.authorId);
                    const category = categories.find(c => c.id === book.categoryId);
                    
                    return `
                        <tr>
                            <td>
                                <div class="table-book-info">
                                    <img src="${book.image}" alt="" class="table-book-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                                    <div>
                                        <span>${book.title}</span>
                                        ${book.bestSeller ? '<span style="font-size: 11px; color: #D4AF37; display: block;"><i class="fas fa-fire"></i> الأكثر مبيعاً</span>' : ''}
                                        ${book.rawqan ? '<span style="font-size: 11px; color: #D4AF37; display: block;"><i class="fas fa-crown"></i> روقان</span>' : ''}
                                    </div>
                                </div>
                            </td>
                            <td>${category?.name || '-'}</td>
                            <td>${author?.name || '-'}</td>
                            <td style="color: #D4AF37; font-weight: 700;">${book.price} ر.س</td>
                            <td>
                                <div class="table-actions">
                                    <button class="action-btn edit" onclick="editBook(${book.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn delete" onclick="deleteBook(${book.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function loadAdminOrders() {
    const orders = getStorage('orders');
    const container = document.getElementById('adminOrdersList');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--white-muted); padding: 40px;">لا توجد طلبات بعد</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="admin-order-card">
            <div class="admin-order-header">
                <div>
                    <div class="admin-order-id">${order.id}</div>
                    <div class="admin-order-date">${new Date(order.date).toLocaleString('ar-SA')}</div>
                </div>
                <span class="admin-order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="admin-order-customer">
                <p><i class="fas fa-user ml-2"></i>${order.customerName} - ${order.phone}</p>
                <p><i class="fas fa-location-dot ml-2"></i>${order.city} - ${order.address}</p>
                ${order.email ? `<p><i class="fas fa-envelope ml-2"></i>${order.email}</p>` : ''}
            </div>
            <div class="admin-order-items">
                ${order.items.map(item => `
                    <div class="admin-order-item">
                        <span class="admin-order-item-title">${item.title} (${item.quantity}×)</span>
                        <span class="admin-order-item-price">${item.price * item.quantity} ر.س</span>
                    </div>
                `).join('')}
            </div>
            ${order.discount > 0 ? `<div style="padding: 8px 16px; color: #4ade80; font-size: 13px;">خصم: -${order.discount} ر.س</div>` : ''}
            <div class="admin-order-total">
                <span>الإجمالي</span>
                <span>${order.total} ر.س</span>
            </div>
            ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
            <div class="admin-order-actions">
                <button class="action-btn status" onclick="updateOrderStatus('${order.id}', 'processing')">جاري التجهيز</button>
                <button class="action-btn status" onclick="updateOrderStatus('${order.id}', 'shipped')">في الطريق</button>
                <button class="action-btn edit" onclick="updateOrderStatus('${order.id}', 'delivered')">مكتمل</button>
                <button class="action-btn delete" onclick="updateOrderStatus('${order.id}', 'cancelled')">إلغاء</button>
            </div>
            ` : ''}
        </div>
    `).join('');
}

function searchInvoice() {
    const search = document.getElementById('searchInvoice')?.value.trim().toUpperCase();
    const orders = getStorage('orders');
    
    if (!search) {
        loadAdminOrders();
        return;
    }
    
    const filtered = orders.filter(o => o.id.toUpperCase().includes(search));
    const container = document.getElementById('adminOrdersList');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--white-muted); padding: 40px;">لا توجد نتائج</p>';
        return;
    }
    
    // Re-render with filtered
    container.innerHTML = filtered.map(order => `
        <div class="admin-order-card">
            <div class="admin-order-header">
                <div>
                    <div class="admin-order-id">${order.id}</div>
                    <div class="admin-order-date">${new Date(order.date).toLocaleString('ar-SA')}</div>
                </div>
                <span class="admin-order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="admin-order-customer">
                <p><i class="fas fa-user ml-2"></i>${order.customerName} - ${order.phone}</p>
                <p><i class="fas fa-location-dot ml-2"></i>${order.city} - ${order.address}</p>
            </div>
            <div class="admin-order-items">
                ${order.items.map(item => `
                    <div class="admin-order-item">
                        <span class="admin-order-item-title">${item.title} (${item.quantity}×)</span>
                        <span class="admin-order-item-price">${item.price * item.quantity} ر.س</span>
                    </div>
                `).join('')}
            </div>
            <div class="admin-order-total">
                <span>الإجمالي</span>
                <span>${order.total} ر.س</span>
            </div>
        </div>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    const orders = getStorage('orders');
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        order.status = status;
        setStorage('orders', orders);
        await syncToServer('orders', 'update', order);
        loadAdminOrders();
        showToast('تم تحديث حالة الطلب');
    }
}

function loadAdminAuthors() {
    const authors = getStorage('authors');
    const container = document.getElementById('adminAuthorsList');
    if (!container) return;
    
    const books = getStorage('books');
    
    container.innerHTML = authors.map(author => {
        const count = books.filter(b => b.authorId === author.id).length;
        return `
            <div class="manager-card">
                <div class="manager-card-header">
                    <img src="${author.image}" alt="" class="manager-card-image" onerror="this.src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'">
                    <div>
                        <h4 class="manager-card-name">${author.name}</h4>
                        <span class="manager-card-meta">${count} كتاب</span>
                    </div>
                </div>
                <p class="manager-card-desc">${author.bio}</p>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editAuthor(${author.id})">تعديل</button>
                    <button class="action-btn delete" onclick="deleteAuthor(${author.id})">حذف</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadAdminCategories() {
    const categories = getStorage('categories');
    const container = document.getElementById('adminCategoriesList');
    if (!container) return;
    
    const books = getStorage('books');
    
    container.innerHTML = categories.map(cat => {
        const count = books.filter(b => b.categoryId === cat.id).length;
        return `
            <div class="manager-card">
                <div class="manager-card-header">
                    <div class="manager-card-icon" style="color: ${cat.color};">
                        <i class="fas fa-${cat.icon}"></i>
                    </div>
                    <div>
                        <h4 class="manager-card-name">${cat.name}</h4>
                        <span class="manager-card-meta">${count} كتاب</span>
                    </div>
                </div>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editCategory(${cat.id})">تعديل</button>
                    <button class="action-btn delete" onclick="deleteCategory(${cat.id})">حذف</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadAdminBanners() {
    const banners = getStorage('banners');
    const container = document.getElementById('adminBannersList');
    if (!container) return;
    
    container.innerHTML = banners.map((banner, index) => `
        <div class="manager-card">
            <div class="manager-card-header">
                <img src="${banner.image}" alt="" style="width: 80px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&q=80'">
                <div>
                    <h4 class="manager-card-name">${banner.title}</h4>
                    <span class="manager-card-meta">البانر ${index + 1} | ${banner.tag || 'بدون تاغ'}</span>
                </div>
            </div>
            <div class="table-actions">
                <button class="action-btn edit" onclick="editBanner(${banner.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="action-btn delete" onclick="deleteBanner(${banner.id})">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');
}

// Banner Modal Functions
function openBannerModal(bannerId = null) {
    if (bannerId) {
        const banners = getStorage('banners');
        const banner = banners.find(b => b.id === bannerId);
        if (banner) {
            document.getElementById('editBannerId').value = bannerId;
            document.getElementById('bannerModalTitle').textContent = 'تعديل البانر';
            document.getElementById('bannerTitle').value = banner.title;
            document.getElementById('bannerTag').value = banner.tag || '';
            document.getElementById('bannerImage').value = banner.image;
            document.getElementById('bannerLink').value = banner.link || 'categories';
        }
    } else {
        document.getElementById('editBannerId').value = '';
        document.getElementById('bannerModalTitle').textContent = 'إضافة بانر جديد';
        document.getElementById('adminBannerForm')?.reset();
    }
    
    document.getElementById('adminBannerOverlay')?.classList.add('active');
    document.getElementById('adminBannerModal')?.classList.add('active');
}

function editBanner(bannerId) {
    openBannerModal(bannerId);
}

function closeAdminBannerModal() {
    document.getElementById('adminBannerOverlay')?.classList.remove('active');
    document.getElementById('adminBannerModal')?.classList.remove('active');
}

async function deleteBanner(bannerId) {
    if (!confirm('هل أنت متأكد من حذف هذا البانر؟')) return;
    
    let banners = getStorage('banners');
    const bannerToDelete = banners.find(b => b.id === bannerId);
    banners = banners.filter(b => b.id !== bannerId);
    setStorage('banners', banners);
    
    if (bannerToDelete) {
        await syncToServer('banners', 'delete', bannerToDelete);
    }
    
    adminTab('banners');
    showToast('تم حذف البانر');
}

function initBannerForm() {
    const form = document.getElementById('adminBannerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('editBannerId').value;
            let banners = getStorage('banners');
            
            const bannerData = {
                title: document.getElementById('bannerTitle').value,
                tag: document.getElementById('bannerTag').value,
                image: document.getElementById('bannerImage').value,
                link: document.getElementById('bannerLink').value || 'categories'
            };
            
            if (editId) {
                const index = banners.findIndex(b => b.id === parseInt(editId));
                if (index !== -1) {
                    const updatedBanner = { ...banners[index], ...bannerData };
                    banners[index] = updatedBanner;
                    setStorage('banners', banners);
                    await syncToServer('banners', 'update', updatedBanner);
                    showToast('تم تحديث البانر');
                }
            } else {
                const newId = banners.length > 0 ? Math.max(...banners.map(b => b.id)) + 1 : 1;
                const newBanner = { id: newId, ...bannerData };
                banners.push(newBanner);
                setStorage('banners', banners);
                await syncToServer('banners', 'add', newBanner);
                showToast('تم إضافة البانر');
            }
            
            closeAdminBannerModal();
            adminTab('banners');
            
            // Refresh home page banners if on home
            const homePage = document.getElementById('homePage');
            if (homePage && homePage.classList.contains('active')) {
                renderDynamicBanners();
                startBannerCarousel();
            }
        });
    }
}

function loadAdminCoupons() {
    const coupons = getStorage('coupons');
    const container = document.getElementById('adminCouponsList');
    if (!container) return;
    
    container.innerHTML = coupons.map(coupon => `
        <div class="manager-card">
            <div class="manager-card-header">
                <div class="manager-card-icon" style="background: rgba(212, 175, 55, 0.15); color: #D4AF37;">
                    <i class="fas fa-ticket"></i>
                </div>
                <div>
                    <h4 class="manager-card-name">${coupon.code}</h4>
                    <span class="manager-card-meta">خصم ${coupon.discount}% ${coupon.minOrder ? ` - حد أدنى: ${coupon.minOrder} ر.س` : ''}</span>
                </div>
            </div>
            <div class="table-actions">
                <button class="action-btn ${coupon.active ? 'edit' : 'delete'}" onclick="toggleCoupon(${coupon.id})">
                    ${coupon.active ? 'تعطيل' : 'تفعيل'}
                </button>
                <button class="action-btn delete" onclick="deleteCoupon(${coupon.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function loadAdminOther() {
    const products = getStorage('other_products');
    const container = document.getElementById('adminOtherList');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--white-muted); padding: 40px; grid-column: 1/-1;">لا توجد منتجات أخرى بعد</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="manager-card">
            <div class="manager-card-header">
                <img src="${product.image}" alt="" class="manager-card-image" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'">
                <div>
                    <h4 class="manager-card-name">${product.name}</h4>
                    <span class="manager-card-meta">${product.price} ر.س</span>
                </div>
            </div>
            <p class="manager-card-desc">${product.description || ''}</p>
            <div class="table-actions">
                <button class="action-btn edit" onclick="editOther(${product.id})">تعديل</button>
                <button class="action-btn delete" onclick="deleteOther(${product.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// ADMIN MODALS
// ============================================

// Book Modal
function openBookModal() {
    document.getElementById('editBookId').value = '';
    document.getElementById('bookModalTitle').textContent = 'إضافة كتاب جديد';
    document.getElementById('adminBookForm')?.reset();
    
    populateBookDropdowns();
    document.getElementById('adminBookOverlay')?.classList.add('active');
    document.getElementById('adminBookModal')?.classList.add('active');
}

function populateBookDropdowns() {
    const authors = getStorage('authors');
    const categories = getStorage('categories');
    
    const authorSelect = document.getElementById('bookAuthor');
    const categorySelect = document.getElementById('bookCategory');
    
    if (authorSelect) {
        authorSelect.innerHTML = '<option value="">اختر المؤلف</option>' + 
            authors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }
    
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">اختر الفئة</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

function editBook(bookId) {
    const books = getStorage('books');
    const book = books.find(b => b.id === bookId);
    
    if (!book) return;
    
    document.getElementById('editBookId').value = bookId;
    document.getElementById('bookModalTitle').textContent = 'تعديل الكتاب';
    
    populateBookDropdowns();
    
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.authorId;
    document.getElementById('bookCategory').value = book.categoryId;
    document.getElementById('bookPrice').value = book.price;
    document.getElementById('bookPages').value = book.pages || '';
    document.getElementById('bookDescription').value = book.description || '';
    document.getElementById('bookImage').value = book.image || '';
    document.getElementById('bookBestSeller').checked = book.bestSeller;
    document.getElementById('bookRawqan').checked = book.rawqan;
    
    document.getElementById('adminBookOverlay')?.classList.add('active');
    document.getElementById('adminBookModal')?.classList.add('active');
}

function closeAdminBookModal() {
    document.getElementById('adminBookOverlay')?.classList.remove('active');
    document.getElementById('adminBookModal')?.classList.remove('active');
}

function initBookForm() {
    const form = document.getElementById('adminBookForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('editBookId').value;
            let books = getStorage('books');
            
            const bookData = {
                title: document.getElementById('bookTitle').value,
                authorId: parseInt(document.getElementById('bookAuthor').value),
                categoryId: parseInt(document.getElementById('bookCategory').value),
                price: parseFloat(document.getElementById('bookPrice').value),
                pages: parseInt(document.getElementById('bookPages').value) || 0,
                description: document.getElementById('bookDescription').value,
                image: document.getElementById('bookImage').value || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
                rating: 4.5,
                bestSeller: document.getElementById('bookBestSeller').checked,
                rawqan: document.getElementById('bookRawqan').checked
            };
            
            if (editId) {
                const index = books.findIndex(b => b.id === parseInt(editId));
                if (index !== -1) {
                    const updatedBook = { ...books[index], ...bookData };
                    books[index] = updatedBook;
                    setStorage('books', books);
                    await syncToServer('books', 'update', updatedBook);
                    showToast('تم تحديث الكتاب');
                }
            } else {
                const newId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;
                const newBook = { id: newId, ...bookData };
                books.push(newBook);
                setStorage('books', books);
                await syncToServer('books', 'add', newBook);
                showToast('تم إضافة الكتاب');
            }
            
            closeAdminBookModal();
            adminTab('books');
        });
    }
}

async function deleteBook(bookId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;
    
    let books = getStorage('books');
    const bookToDelete = books.find(b => b.id === bookId);
    books = books.filter(b => b.id !== bookId);
    setStorage('books', books);
    
    if (bookToDelete) {
        await syncToServer('books', 'delete', bookToDelete);
    }
    
    adminTab('books');
    showToast('تم حذف الكتاب');
}

// Author Modal
function openAuthorModal() {
    document.getElementById('editAuthorId').value = '';
    document.getElementById('authorModalTitle').textContent = 'إضافة مؤلف';
    document.getElementById('adminAuthorForm')?.reset();
    
    document.getElementById('adminAuthorOverlay')?.classList.add('active');
    document.getElementById('adminAuthorModal')?.classList.add('active');
}

function editAuthor(authorId) {
    const authors = getStorage('authors');
    const author = authors.find(a => a.id === authorId);
    
    if (!author) return;
    
    document.getElementById('editAuthorId').value = authorId;
    document.getElementById('authorModalTitle').textContent = 'تعديل المؤلف';
    
    document.getElementById('authorName').value = author.name;
    document.getElementById('authorBio').value = author.bio || '';
    document.getElementById('authorImage').value = author.image || '';
    
    document.getElementById('adminAuthorOverlay')?.classList.add('active');
    document.getElementById('adminAuthorModal')?.classList.add('active');
}

function closeAdminAuthorModal() {
    document.getElementById('adminAuthorOverlay')?.classList.remove('active');
    document.getElementById('adminAuthorModal')?.classList.remove('active');
}

function initAuthorForm() {
    const form = document.getElementById('adminAuthorForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('editAuthorId').value;
            let authors = getStorage('authors');
            
            const authorData = {
                name: document.getElementById('authorName').value,
                bio: document.getElementById('authorBio').value,
                image: document.getElementById('authorImage').value || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'
            };
            
            if (editId) {
                const index = authors.findIndex(a => a.id === parseInt(editId));
                if (index !== -1) {
                    const updatedAuthor = { ...authors[index], ...authorData };
                    authors[index] = updatedAuthor;
                    setStorage('authors', authors);
                    await syncToServer('authors', 'update', updatedAuthor);
                    showToast('تم تحديث المؤلف');
                }
            } else {
                const newId = authors.length > 0 ? Math.max(...authors.map(a => a.id)) + 1 : 1;
                const newAuthor = { id: newId, ...authorData };
                authors.push(newAuthor);
                setStorage('authors', authors);
                await syncToServer('authors', 'add', newAuthor);
                showToast('تم إضافة المؤلف');
            }
            
            closeAdminAuthorModal();
            adminTab('authors');
        });
    }
}

async function deleteAuthor(authorId) {
    if (!confirm('هل أنت متأكد من حذف هذا المؤلف؟')) return;
    
    let authors = getStorage('authors');
    const authorToDelete = authors.find(a => a.id === authorId);
    authors = authors.filter(a => a.id !== authorId);
    setStorage('authors', authors);
    
    if (authorToDelete) {
        await syncToServer('authors', 'delete', authorToDelete);
    }
    
    adminTab('authors');
    showToast('تم حذف المؤلف');
}

// Category Modal
function openCategoryModal() {
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'إضافة فئة';
    document.getElementById('adminCategoryForm')?.reset();
    
    document.getElementById('adminCategoryOverlay')?.classList.add('active');
    document.getElementById('adminCategoryModal')?.classList.add('active');
}

function editCategory(categoryId) {
    const categories = getStorage('categories');
    const cat = categories.find(c => c.id === categoryId);
    
    if (!cat) return;
    
    document.getElementById('editCategoryId').value = categoryId;
    document.getElementById('categoryModalTitle').textContent = 'تعديل الفئة';
    
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryIcon').value = cat.icon || 'book';
    document.getElementById('categoryColor').value = cat.color || '#D4AF37';
    
    document.getElementById('adminCategoryOverlay')?.classList.add('active');
    document.getElementById('adminCategoryModal')?.classList.add('active');
}

function closeAdminCategoryModal() {
    document.getElementById('adminCategoryOverlay')?.classList.remove('active');
    document.getElementById('adminCategoryModal')?.classList.remove('active');
}

function initCategoryForm() {
    const form = document.getElementById('adminCategoryForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('editCategoryId').value;
            let categories = getStorage('categories');
            
            const catData = {
                name: document.getElementById('categoryName').value,
                icon: document.getElementById('categoryIcon').value || 'book',
                color: document.getElementById('categoryColor').value || '#D4AF37'
            };
            
            if (editId) {
                const index = categories.findIndex(c => c.id === parseInt(editId));
                if (index !== -1) {
                    const updatedCategory = { ...categories[index], ...catData };
                    categories[index] = updatedCategory;
                    setStorage('categories', categories);
                    await syncToServer('categories', 'update', updatedCategory);
                    showToast('تم تحديث الفئة');
                }
            } else {
                const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
                const newCategory = { id: newId, ...catData };
                categories.push(newCategory);
                setStorage('categories', categories);
                await syncToServer('categories', 'add', newCategory);
                showToast('تم إضافة الفئة');
            }
            
            closeAdminCategoryModal();
            adminTab('categories');
        });
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    
    let categories = getStorage('categories');
    const categoryToDelete = categories.find(c => c.id === categoryId);
    categories = categories.filter(c => c.id !== categoryId);
    setStorage('categories', categories);
    
    if (categoryToDelete) {
        await syncToServer('categories', 'delete', categoryToDelete);
    }
    
    adminTab('categories');
    showToast('تم حذف الفئة');
}

// Coupon Modal
function openCouponModal() {
    document.getElementById('editCouponId').value = '';
    document.getElementById('couponModalTitle').textContent = 'إضافة كوبون';
    document.getElementById('adminCouponForm')?.reset();
    
    document.getElementById('adminCouponOverlay')?.classList.add('active');
    document.getElementById('adminCouponModal')?.classList.add('active');
}

function closeAdminCouponModal() {
    document.getElementById('adminCouponOverlay')?.classList.remove('active');
    document.getElementById('adminCouponModal')?.classList.remove('active');
}

function initCouponForm() {
    const form = document.getElementById('adminCouponForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            let coupons = getStorage('coupons');
            
            const couponData = {
                code: document.getElementById('couponCode').value.toUpperCase(),
                discount: parseInt(document.getElementById('couponDiscount').value),
                minOrder: parseInt(document.getElementById('couponMinOrder').value) || 0,
                expiry: document.getElementById('couponExpiry').value || null,
                active: true
            };
            
            const newId = coupons.length > 0 ? Math.max(...coupons.map(c => c.id)) + 1 : 1;
            const newCoupon = { id: newId, ...couponData };
            coupons.push(newCoupon);
            
            setStorage('coupons', coupons);
            await syncToServer('coupons', 'add', newCoupon);
            
            closeAdminCouponModal();
            adminTab('coupons');
            showToast('تم إضافة الكوبون');
        });
    }
}

async function toggleCoupon(couponId) {
    let coupons = getStorage('coupons');
    const coupon = coupons.find(c => c.id === couponId);
    
    if (coupon) {
        coupon.active = !coupon.active;
        setStorage('coupons', coupons);
        await syncToServer('coupons', 'update', coupon);
        adminTab('coupons');
        showToast(coupon.active ? 'تم تفعيل الكوبون' : 'تم تعطيل الكوبون');
    }
}

async function deleteCoupon(couponId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    
    let coupons = getStorage('coupons');
    const couponToDelete = coupons.find(c => c.id === couponId);
    coupons = coupons.filter(c => c.id !== couponId);
    setStorage('coupons', coupons);
    
    if (couponToDelete) {
        await syncToServer('coupons', 'delete', couponToDelete);
    }
    
    adminTab('coupons');
    showToast('تم حذف الكوبون');
}

// Other Products Modal
function openOtherModal() {
    document.getElementById('editOtherId').value = '';
    document.getElementById('otherModalTitle').textContent = 'إضافة منتج';
    document.getElementById('adminOtherForm')?.reset();
    
    document.getElementById('adminOtherOverlay')?.classList.add('active');
    document.getElementById('adminOtherModal')?.classList.add('active');
}

function closeAdminOtherModal() {
    document.getElementById('adminOtherOverlay')?.classList.remove('active');
    document.getElementById('adminOtherModal')?.classList.remove('active');
}

function initOtherForm() {
    const form = document.getElementById('adminOtherForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('editOtherId').value;
            let products = getStorage('other_products');
            
            const productData = {
                name: document.getElementById('otherName').value,
                type: document.getElementById('otherType').value,
                price: parseFloat(document.getElementById('otherPrice').value),
                description: document.getElementById('otherDescription').value,
                image: document.getElementById('otherImage').value || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'
            };
            
            if (editId) {
                const index = products.findIndex(p => p.id === parseInt(editId));
                if (index !== -1) {
                    const updatedProduct = { ...products[index], ...productData };
                    products[index] = updatedProduct;
                    setStorage('other_products', products);
                    await syncToServer('other_products', 'update', updatedProduct);
                    showToast('تم تحديث المنتج');
                }
            } else {
                const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
                const newProduct = { id: newId, ...productData };
                products.push(newProduct);
                setStorage('other_products', products);
                await syncToServer('other_products', 'add', newProduct);
                showToast('تم إضافة المنتج');
            }
            
            closeAdminOtherModal();
            adminTab('other');
        });
    }
}

async function deleteOther(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    let products = getStorage('other_products');
    const productToDelete = products.find(p => p.id === productId);
    products = products.filter(p => p.id !== productId);
    setStorage('other_products', products);
    
    if (productToDelete) {
        await syncToServer('other_products', 'delete', productToDelete);
    }
    
    adminTab('other');
    showToast('تم حذف المنتج');
}

// ============================================
// TOAST
// ============================================

function showToast(message) {
    // Remove existing toasts
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <i class="fas fa-check-circle" style="color: #D4AF37; margin-left: 8px;"></i>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: rgba(15, 15, 15, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 12px;
        padding: 14px 28px;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        display: flex;
        align-items: center;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================
// SCROLL TO SECTION
// ============================================

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// PARALLAX EFFECT
// ============================================

function initParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-bg-image');
        
        if (heroImage && scrolled < window.innerHeight) {
            heroImage.style.transform = `scale(1.1) translateY(${scrolled * 0.3}px)`;
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

// ============================================
// الدالة الرئيسية للتهيئة مع المزامنة مع الخادم
// ============================================
async function initializeApp() {
    console.log('🚀 Initializing Rawqan Bookstore...');
    
    // 1. تهيئة التخزين المحلي أولاً (للحالات التي لا يعمل فيها الخادم)
    initStorage();
    
    // 2. محاولة المزامنة مع الخادم
    console.log('🔄 Attempting to sync with server...');
    const syncSuccess = await syncFromServer();
    
    if (syncSuccess) {
        console.log('✅ Connected to server - using central database');
        console.log('📍 All devices will share the same data');
    } else {
        console.log('⚠️ Running in LOCAL mode - changes only affect this device');
        console.log('💡 Start the server with: cd server && npm install && npm start');
    }
    
    // 3. تعيين أزرار العملة
    document.getElementById('sarBtn')?.classList.toggle('active', currentCurrency === 'SAR');
    document.getElementById('yerBtn')?.classList.toggle('active', currentCurrency === 'YER');
    
    // 4. تحميل الصفحة الرئيسية
    loadHomePage();
    startBannerCarousel();
    
    // 5. تأثيرات التحميل
    initHeaderScroll();
    initParallax();
    
    // 6. تأثير الريبل عند النقر
    document.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.book-card') || e.target.closest('.category-card-liquid')) {
            createRipple(e);
        }
    });
    
    // 7. تهيئة نماذج الإدارة
    initModalAddToCart();
    initCheckoutForm();
    initBookForm();
    initAuthorForm();
    initCategoryForm();
    initCouponForm();
    initOtherForm();
    initBannerForm();
    
    // 8. اختصارات لوحة المفاتيح
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adminLogin();
    });
    
    document.getElementById('trackInvoice')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') trackOrder();
    });
    
    // 9. تأثيرات الحركة
    initMagnetic();
    updateCartCount();
    
    console.log('✅ Rawqan Bookstore initialized successfully!');
}

// تشغيل التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initializeApp);
