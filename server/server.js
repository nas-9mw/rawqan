const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// Default data
const defaultData = {
    categories: [
        { id: 1, name: 'روايات و أدب', icon: 'book-open', color: '#D4AF37' },
        { id: 2, name: 'تنمية ذاتية', icon: 'brain', color: '#F4E4BC' },
        { id: 3, name: 'تاريخ', icon: 'landmark', color: '#B8960C' },
        { id: 4, name: 'علوم', icon: 'flask', color: '#D4AF37' },
        { id: 5, name: 'دين', icon: 'kaaba', color: '#F4E4BC' },
        { id: 6, name: 'أطفال', icon: 'child-reaching', color: '#D4AF37' },
        { id: 7, name: 'شعر', icon: 'feather', color: '#B8960C' },
        { id: 8, name: 'أعمال و إدارة', icon: 'briefcase', color: '#F4E4BC' }
    ],
    authors: [
        { id: 1, name: 'غسان كنفاني', bio: 'أديب وفيلسوف فلسطيني، يعتبر من أهم الأدباء العرب في القرن العشرين.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
        { id: 2, name: 'نجيب محفوظ', bio: 'الأديب المصري الحاصل على جائزة نوبل في الآداب، مؤلف العديد من الروايات الكلاسيكية.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
        { id: 3, name: 'طارق الحبيب', bio: 'طبيب ومحاضر وكاتب سعودي متخصص في التنمية البشرية والعلاقات الأسرية.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop' },
        { id: 4, name: 'محمد الغزالي', bio: 'عالم دين مصري بارز، عضو الإمام الأعز، له العديد من المؤلفات في الفكر الإسلامي.', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop' },
        { id: 5, name: 'أحمد خالد توفيق', bio: 'كاتب ومترجم مصري، يُعرف بأدبه الخيالي والغموض، مؤلف سلسلة ما وراء الطبيعة.', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop' },
        { id: 6, name: 'إحسان عبد القدوس', bio: 'صحفي وكاتب مصري، يُعرف برواياته الرومانسية وطبيبته الاجتماعية.', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
        { id: 7, name: 'يوسف السباعي', bio: 'أديب وصحفي مصري، كان وزيراً للثقافة، له العديد من الروايات والمسرحيات.', image: 'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=200&h=200&fit=crop' },
        { id: 8, name: 'عبد الرحمن منيف', bio: 'روائي سعودي، مؤلف سلسلة مدن الملح التي تصور الحياة في الخليج.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' }
    ],
    books: [
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
    ],
    reviews: [
        { id: 1, name: 'أحمد محمد', text: 'متجر رائع جداً، الكتب أصلية والتوصيل سريع. أنصح به بشدة!', rating: 5 },
        { id: 2, name: 'فاطمة علي', text: 'تشكيلة مذهلة من الكتب العربية والعالمية. تجربة تسوق رائعة.', rating: 5 },
        { id: 3, name: 'محمد سعيد', text: 'التصميم جميل جداً والخدمة ممتازة. سأعود للتسوق هنا حتماً.', rating: 4 },
        { id: 4, name: 'نورة خالد', text: 'أفضل متجر كتب إلكتروني جربته. الكتب أصلية والأسعار مناسبة.', rating: 5 },
        { id: 5, name: 'عبدالله يوسف', text: 'مجموعة رائعة من الروايات الكلاسيكية. اشتريت أكثر من 10 كتاب.', rating: 5 },
        { id: 6, name: 'سارة أحمد', text: 'التوصيل كان أسرع مما توقعت. الكتب بحالة ممتازة.', rating: 4 }
    ],
    coupons: [
        { id: 1, code: 'WELCOME10', discount: 10, minOrder: 100, expiry: null, active: true },
        { id: 2, code: 'SAVE20', discount: 20, minOrder: 200, expiry: '2026-12-31', active: true }
    ],
    banners: [
        { id: 1, title: 'خصم 30% على مجموعة روايات مايو', tag: 'عرض خاص', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&q=80', link: 'categories' },
        { id: 2, title: 'وصلنا إصدارات شهر مايو الجديدة', tag: 'جديد', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1600&q=80', link: 'rawqan' },
        { id: 3, title: 'الشحن مجاني للطلبات فوق 200 ريال', tag: 'مجاني', image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80', link: 'categories' }
    ],
    orders: [],
    otherProducts: []
};

// Initialize data file if not exists
function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log('Data file created with default data');
    }
}

// Read data
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        initDataFile();
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// Write data
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ====================
// API ROUTES
// ====================

// GET: Welcome
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ====================
// CRUD - Categories
// ====================
app.get('/api/categories', (req, res) => {
    const data = readData();
    res.json(data.categories);
});

app.post('/api/categories', (req, res) => {
    const data = readData();
    const newId = data.categories.length > 0 ? Math.max(...data.categories.map(c => c.id)) + 1 : 1;
    const newCategory = { id: newId, ...req.body };
    data.categories.push(newCategory);
    writeData(data);
    res.json(newCategory);
});

app.put('/api/categories/:id', (req, res) => {
    const data = readData();
    const index = data.categories.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Category not found' });
    }
    data.categories[index] = { ...data.categories[index], ...req.body };
    writeData(data);
    res.json(data.categories[index]);
});

app.delete('/api/categories/:id', (req, res) => {
    const data = readData();
    data.categories = data.categories.filter(c => c.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

// ====================
// CRUD - Authors
// ====================
app.get('/api/authors', (req, res) => {
    const data = readData();
    res.json(data.authors);
});

app.post('/api/authors', (req, res) => {
    const data = readData();
    const newId = data.authors.length > 0 ? Math.max(...data.authors.map(a => a.id)) + 1 : 1;
    const newAuthor = { id: newId, ...req.body };
    data.authors.push(newAuthor);
    writeData(data);
    res.json(newAuthor);
});

app.put('/api/authors/:id', (req, res) => {
    const data = readData();
    const index = data.authors.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Author not found' });
    }
    data.authors[index] = { ...data.authors[index], ...req.body };
    writeData(data);
    res.json(data.authors[index]);
});

app.delete('/api/authors/:id', (req, res) => {
    const data = readData();
    data.authors = data.authors.filter(a => a.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

// ====================
// CRUD - Books
// ====================
app.get('/api/books', (req, res) => {
    const data = readData();
    res.json(data.books);
});

app.get('/api/books/:id', (req, res) => {
    const data = readData();
    const book = data.books.find(b => b.id === parseInt(req.params.id));
    if (!book) {
        return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
});

app.post('/api/books', (req, res) => {
    const data = readData();
    const newId = data.books.length > 0 ? Math.max(...data.books.map(b => b.id)) + 1 : 1;
    const newBook = { id: newId, ...req.body };
    data.books.push(newBook);
    writeData(data);
    res.json(newBook);
});

app.put('/api/books/:id', (req, res) => {
    const data = readData();
    const index = data.books.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Book not found' });
    }
    data.books[index] = { ...data.books[index], ...req.body };
    writeData(data);
    res.json(data.books[index]);
});

app.delete('/api/books/:id', (req, res) => {
    const data = readData();
    data.books = data.books.filter(b => b.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

// ====================
// CRUD - Banners
// ====================
app.get('/api/banners', (req, res) => {
    const data = readData();
    res.json(data.banners);
});

app.post('/api/banners', (req, res) => {
    const data = readData();
    const newId = data.banners.length > 0 ? Math.max(...data.banners.map(b => b.id)) + 1 : 1;
    const newBanner = { id: newId, ...req.body };
    data.banners.push(newBanner);
    writeData(data);
    res.json(newBanner);
});

app.put('/api/banners/:id', (req, res) => {
    const data = readData();
    const index = data.banners.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Banner not found' });
    }
    data.banners[index] = { ...data.banners[index], ...req.body };
    writeData(data);
    res.json(data.banners[index]);
});

app.delete('/api/banners/:id', (req, res) => {
    const data = readData();
    data.banners = data.banners.filter(b => b.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

// ====================
// CRUD - Coupons
// ====================
app.get('/api/coupons', (req, res) => {
    const data = readData();
    res.json(data.coupons);
});

app.post('/api/coupons', (req, res) => {
    const data = readData();
    const newId = data.coupons.length > 0 ? Math.max(...data.coupons.map(c => c.id)) + 1 : 1;
    const newCoupon = { id: newId, ...req.body };
    data.coupons.push(newCoupon);
    writeData(data);
    res.json(newCoupon);
});

app.put('/api/coupons/:id', (req, res) => {
    const data = readData();
    const index = data.coupons.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Coupon not found' });
    }
    data.coupons[index] = { ...data.coupons[index], ...req.body };
    writeData(data);
    res.json(data.coupons[index]);
});

app.delete('/api/coupons/:id', (req, res) => {
    const data = readData();
    data.coupons = data.coupons.filter(c => c.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

// ====================
// CRUD - Orders
// ====================
app.get('/api/orders', (req, res) => {
    const data = readData();
    res.json(data.orders);
});

app.get('/api/orders/:id', (req, res) => {
    const data = readData();
    const order = data.orders.find(o => o.id === req.params.id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
});

app.post('/api/orders', (req, res) => {
    const data = readData();
    const newOrder = { ...req.body, date: new Date().toISOString() };
    data.orders.unshift(newOrder);
    writeData(data);
    res.json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
    const data = readData();
    const index = data.orders.findIndex(o => o.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Order not found' });
    }
    data.orders[index] = { ...data.orders[index], ...req.body };
    writeData(data);
    res.json(data.orders[index]);
});

// ====================
// CRUD - Reviews
// ====================
app.get('/api/reviews', (req, res) => {
    const data = readData();
    res.json(data.reviews);
});

// ====================
// CRUD - Other Products
// ====================
app.get('/api/other-products', (req, res) => {
    const data = readData();
    res.json(data.otherProducts);
});

app.post('/api/other-products', (req, res) => {
    const data = readData();
    const newId = data.otherProducts.length > 0 ? Math.max(...data.otherProducts.map(p => p.id)) + 1 : 1;
    const newProduct = { id: newId, ...req.body };
    data.otherProducts.push(newProduct);
    writeData(data);
    res.json(newProduct);
});

app.put('/api/other-products/:id', (req, res) => {
    const data = readData();
    const index = data.otherProducts.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    data.otherProducts[index] = { ...data.otherProducts[index], ...req.body };
    writeData(data);
    res.json(data.otherProducts[index]);
});

app.delete('/api/other-products/:id', (req, res) => {
    const data = readData();
    data.otherProducts = data.otherProducts.filter(p => p.id !== parseInt(req.params.id));
    writeData(data);
    res.json({ success: true });
});

// ====================
// Get all data (sync)
// ====================
app.get('/api/all', (req, res) => {
    const data = readData();
    res.json(data);
});

// Start server
initDataFile();

app.listen(PORT, () => {
    console.log('========================================');
    console.log('  📚 متجر روقان إلكتروني');
    console.log('========================================');
    console.log(`  🚀 الخادم يعمل على: http://localhost:${PORT}`);
    console.log(`  📁 مجلد الملفات: ${path.join(__dirname, '..')}`);
    console.log(`  💾 ملف البيانات: ${DATA_FILE}`);
    console.log('========================================');
    console.log('  لتشغيل على جميع الأجهزة في الشبكة:');
    console.log(`  http://[عنوان_IP_الخاص]:${PORT}`);
    console.log('========================================');
});
