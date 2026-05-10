/* ============================================
   RAWQAN API WRAPPER
   الاتصال مع الخادم المركزي
   ============================================ */

// تكوين الخادم
const API_CONFIG = {
    // غير هذا العنوان عند النشر على الإنترنت
    baseUrl: window.location.origin,
    // baseUrl: 'http://192.168.1.100:3000', // مثال لشبكة محلية
    timeout: 10000
};

// ذاكرة مؤقتة للبيانات (للأداء الأفضل)
const API_CACHE = {
    books: null,
    authors: null,
    categories: null,
    banners: null,
    coupons: null,
    orders: null,
    reviews: null,
    otherProducts: null,
    lastSync: null
};

// ========== دالة مساعدة للطلبات ==========
async function apiRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        // التحقق من أن الاستجابة ليست فارغة
        const text = await response.text();
        if (!text) {
            return null;
        }
        
        return JSON.parse(text);
    } catch (error) {
        console.error(`API Request failed: ${endpoint}`, error);
        
        // في حالة الفشل، نحاول استخدام البيانات المخزنة محلياً
        const cachedData = localStorage.getItem(`api_cache_${endpoint}`);
        if (cachedData) {
            console.log('Using cached data for:', endpoint);
            return JSON.parse(cachedData);
        }
        
        throw error;
    }
}

// ========== حفظ البيانات في الذاكرة المؤقتة والمحلية ==========
function cacheData(key, data) {
    API_CACHE[key] = data;
    localStorage.setItem(`api_cache_${key}`, JSON.stringify(data));
}

// ========== جلب البيانات من الذاكرة المؤقتة ==========
function getCachedData(key) {
    if (API_CACHE[key] !== null) {
        return API_CACHE[key];
    }
    
    const cached = localStorage.getItem(`api_cache_${key}`);
    if (cached) {
        API_CACHE[key] = JSON.parse(cached);
        return API_CACHE[key];
    }
    
    return null;
}

// ========== الكتب ==========
async function apiGetBooks() {
    const cached = getCachedData('books');
    if (cached) return cached;
    
    const data = await apiRequest('/api/books');
    cacheData('books', data);
    return data;
}

async function apiGetBook(id) {
    return await apiRequest(`/api/books/${id}`);
}

async function apiAddBook(bookData) {
    const data = await apiRequest('/api/books', {
        method: 'POST',
        body: JSON.stringify(bookData)
    });
    
    // تحديث الذاكرة المؤقتة
    const current = await apiGetBooks();
    cacheData('books', [...current, data]);
    
    return data;
}

async function apiUpdateBook(id, bookData) {
    const data = await apiRequest(`/api/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bookData)
    });
    
    // تحديث الذاكرة المؤقتة
    const current = await apiGetBooks();
    cacheData('books', current.map(b => b.id === id ? data : b));
    
    return data;
}

async function apiDeleteBook(id) {
    await apiRequest(`/api/books/${id}`, {
        method: 'DELETE'
    });
    
    // تحديث الذاكرة المؤقتة
    const current = await apiGetBooks();
    cacheData('books', current.filter(b => b.id !== id));
}

// ========== المؤلفون ==========
async function apiGetAuthors() {
    const cached = getCachedData('authors');
    if (cached) return cached;
    
    const data = await apiRequest('/api/authors');
    cacheData('authors', data);
    return data;
}

async function apiAddAuthor(authorData) {
    const data = await apiRequest('/api/authors', {
        method: 'POST',
        body: JSON.stringify(authorData)
    });
    
    const current = await apiGetAuthors();
    cacheData('authors', [...current, data]);
    
    return data;
}

async function apiUpdateAuthor(id, authorData) {
    const data = await apiRequest(`/api/authors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(authorData)
    });
    
    const current = await apiGetAuthors();
    cacheData('authors', current.map(a => a.id === id ? data : a));
    
    return data;
}

async function apiDeleteAuthor(id) {
    await apiRequest(`/api/authors/${id}`, {
        method: 'DELETE'
    });
    
    const current = await apiGetAuthors();
    cacheData('authors', current.filter(a => a.id !== id));
}

// ========== الفئات ==========
async function apiGetCategories() {
    const cached = getCachedData('categories');
    if (cached) return cached;
    
    const data = await apiRequest('/api/categories');
    cacheData('categories', data);
    return data;
}

async function apiAddCategory(catData) {
    const data = await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify(catData)
    });
    
    const current = await apiGetCategories();
    cacheData('categories', [...current, data]);
    
    return data;
}

async function apiUpdateCategory(id, catData) {
    const data = await apiRequest(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(catData)
    });
    
    const current = await apiGetCategories();
    cacheData('categories', current.map(c => c.id === id ? data : c));
    
    return data;
}

async function apiDeleteCategory(id) {
    await apiRequest(`/api/categories/${id}`, {
        method: 'DELETE'
    });
    
    const current = await apiGetCategories();
    cacheData('categories', current.filter(c => c.id !== id));
}

// ========== البنرات ==========
async function apiGetBanners() {
    const cached = getCachedData('banners');
    if (cached) return cached;
    
    const data = await apiRequest('/api/banners');
    cacheData('banners', data);
    return data;
}

async function apiAddBanner(bannerData) {
    const data = await apiRequest('/api/banners', {
        method: 'POST',
        body: JSON.stringify(bannerData)
    });
    
    const current = await apiGetBanners();
    cacheData('banners', [...current, data]);
    
    return data;
}

async function apiUpdateBanner(id, bannerData) {
    const data = await apiRequest(`/api/banners/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bannerData)
    });
    
    const current = await apiGetBanners();
    cacheData('banners', current.map(b => b.id === id ? data : b));
    
    return data;
}

async function apiDeleteBanner(id) {
    await apiRequest(`/api/banners/${id}`, {
        method: 'DELETE'
    });
    
    const current = await apiGetBanners();
    cacheData('banners', current.filter(b => b.id !== id));
}

// ========== الكوبونات ==========
async function apiGetCoupons() {
    const cached = getCachedData('coupons');
    if (cached) return cached;
    
    const data = await apiRequest('/api/coupons');
    cacheData('coupons', data);
    return data;
}

async function apiAddCoupon(couponData) {
    const data = await apiRequest('/api/coupons', {
        method: 'POST',
        body: JSON.stringify(couponData)
    });
    
    const current = await apiGetCoupons();
    cacheData('coupons', [...current, data]);
    
    return data;
}

async function apiUpdateCoupon(id, couponData) {
    const data = await apiRequest(`/api/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(couponData)
    });
    
    const current = await apiGetCoupons();
    cacheData('coupons', current.map(c => c.id === id ? data : c));
    
    return data;
}

async function apiDeleteCoupon(id) {
    await apiRequest(`/api/coupons/${id}`, {
        method: 'DELETE'
    });
    
    const current = await apiGetCoupons();
    cacheData('coupons', current.filter(c => c.id !== id));
}

// ========== الطلبات ==========
async function apiGetOrders() {
    const cached = getCachedData('orders');
    if (cached) return cached;
    
    const data = await apiRequest('/api/orders');
    cacheData('orders', data);
    return data;
}

async function apiGetOrder(id) {
    return await apiRequest(`/api/orders/${id}`);
}

async function apiAddOrder(orderData) {
    const data = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
    
    // الطلبات لا تُخزن مؤقتاً بشكل دائم لأنها تتغير بسرعة
    API_CACHE.orders = null;
    localStorage.removeItem('api_cache_orders');
    
    return data;
}

async function apiUpdateOrder(id, orderData) {
    const data = await apiRequest(`/api/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(orderData)
    });
    
    API_CACHE.orders = null;
    localStorage.removeItem('api_cache_orders');
    
    return data;
}

// ========== التقييمات ==========
async function apiGetReviews() {
    const cached = getCachedData('reviews');
    if (cached) return cached;
    
    const data = await apiRequest('/api/reviews');
    cacheData('reviews', data);
    return data;
}

// ========== المنتجات الأخرى ==========
async function apiGetOtherProducts() {
    const cached = getCachedData('otherProducts');
    if (cached) return cached;
    
    const data = await apiRequest('/api/other-products');
    cacheData('otherProducts', data);
    return data;
}

async function apiAddOtherProduct(productData) {
    const data = await apiRequest('/api/other-products', {
        method: 'POST',
        body: JSON.stringify(productData)
    });
    
    const current = await apiGetOtherProducts();
    cacheData('otherProducts', [...current, data]);
    
    return data;
}

async function apiUpdateOtherProduct(id, productData) {
    const data = await apiRequest(`/api/other-products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
    });
    
    const current = await apiGetOtherProducts();
    cacheData('otherProducts', current.map(p => p.id === id ? data : p));
    
    return data;
}

async function apiDeleteOtherProduct(id) {
    await apiRequest(`/api/other-products/${id}`, {
        method: 'DELETE'
    });
    
    const current = await apiGetOtherProducts();
    cacheData('otherProducts', current.filter(p => p.id !== id));
}

// ========== مزامنة كاملة مع الخادم ==========
async function apiSyncAll() {
    console.log('Syncing all data from server...');
    
    try {
        // جلب البيانات بشكل متوازٍ
        const [books, authors, categories, banners, coupons, reviews] = await Promise.all([
            apiRequest('/api/books'),
            apiRequest('/api/authors'),
            apiRequest('/api/categories'),
            apiRequest('/api/banners'),
            apiRequest('/api/coupons'),
            apiRequest('/api/reviews')
        ]);
        
        // تخزينها في الذاكرة المؤقتة
        cacheData('books', books);
        cacheData('authors', authors);
        cacheData('categories', categories);
        cacheData('banners', banners);
        cacheData('coupons', coupons);
        cacheData('reviews', reviews);
        
        console.log('Data synchronized successfully!');
        API_CACHE.lastSync = new Date().toISOString();
        
        return true;
    } catch (error) {
        console.error('Sync failed:', error);
        
        // المحاولة مع البيانات المحلية المخزنة
        console.log('Using locally cached data...');
        
        // إذا فشلت المزامنة، نحاول استخدام البيانات المحلية من localStorage القديمة
        // أو نعرض رسالة للمستخدم
        return false;
    }
}

// ========== تحديث سريع لصفحة واحدة ==========
async function apiRefreshPage() {
    // مسح الذاكرة المؤقتة وجلب البيانات الجديدة
    API_CACHE.books = null;
    API_CACHE.authors = null;
    API_CACHE.categories = null;
    API_CACHE.banners = null;
    
    return await apiSyncAll();
}

// ========== التحقق من الاتصال بالخادم ==========
async function apiCheckConnection() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/api/books`);
        return response.ok;
    } catch {
        return false;
    }
}

// تصدير الدوال للاستخدام العام
window.API = {
    config: API_CONFIG,
    sync: apiSyncAll,
    refresh: apiRefreshPage,
    checkConnection: apiCheckConnection,
    
    // الكتب
    getBooks: apiGetBooks,
    getBook: apiGetBook,
    addBook: apiAddBook,
    updateBook: apiUpdateBook,
    deleteBook: apiDeleteBook,
    
    // المؤلفون
    getAuthors: apiGetAuthors,
    addAuthor: apiAddAuthor,
    updateAuthor: apiUpdateAuthor,
    deleteAuthor: apiDeleteAuthor,
    
    // الفئات
    getCategories: apiGetCategories,
    addCategory: apiAddCategory,
    updateCategory: apiUpdateCategory,
    deleteCategory: apiDeleteCategory,
    
    // البنرات
    getBanners: apiGetBanners,
    addBanner: apiAddBanner,
    updateBanner: apiUpdateBanner,
    deleteBanner: apiDeleteBanner,
    
    // الكوبونات
    getCoupons: apiGetCoupons,
    addCoupon: apiAddCoupon,
    updateCoupon: apiUpdateCoupon,
    deleteCoupon: apiDeleteCoupon,
    
    // الطلبات
    getOrders: apiGetOrders,
    getOrder: apiGetOrder,
    addOrder: apiAddOrder,
    updateOrder: apiUpdateOrder,
    
    // التقييمات
    getReviews: apiGetReviews,
    
    // المنتجات الأخرى
    getOtherProducts: apiGetOtherProducts,
    addOtherProduct: apiAddOtherProduct,
    updateOtherProduct: apiUpdateOtherProduct,
    deleteOtherProduct: apiDeleteOtherProduct
};
