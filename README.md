# HERFA API - تمكين (Tamken)

هذا المستودع يحتوي على الخادم الخلفي (Backend) لمنصة **HERFA**، وهي منصة إلكترونية للعمل الحر (C2C) تربط بين العملاء ومزودي الخدمات المهرة (مثل السباكة، النجارة، النظافة، إلخ). تم بناء النظام باستخدام إطار عمل **NestJS** بناءً على هيكلة معمارية تركيبية (Modular Architecture).

## 🛠️ التقنيات المستخدمة (Tech Stack)
- **الإطار البرمجي:** NestJS (TypeScript)
- **قاعدة البيانات:** PostgreSQL مع TypeORM
- **التخزين المؤقت (Caching):** Redis عبر `@nestjs/cache-manager`
- **المحادثات الفورية (Real-time):** Socket.IO (WebSockets)
- **الأمان والمصادقة:** JWT (JSON Web Tokens) و Bcrypt
- **التحقق من البيانات (Validation):** Zod
- **التوثيق:** Swagger UI

---

## 🚀 الخصائص والمميزات (Features)

النظام مقسم إلى 7 أقسام (Modules) رئيسية:

1. **Auth (`/auth`):** إدارة تسجيل الدخول، إنشاء حسابات جديدة (عميل أو مزود خدمة)، إصدار الـ Access Tokens والـ Refresh Tokens، بالإضافة لحماية المسارات بناءً على صلاحيات المستخدم (`Roles`).
2. **Providers (`/providers` & `/users/me/provider-profile`):** إدارة الملفات الشخصية لمزودي الخدمات، أسعارهم بالساعة، النبذة الشخصية، والفئات التي يخدمونها.
3. **Discovery (`/search`):** محرك البحث الخاص بالعملاء للعثور على المزودين بناءً على الفلاتر (التصنيف، المدينة، التقييم، والسعر). يدعم التخزين المؤقت (Caching) لتسريع الاستجابة.
4. **Jobs (`/requests`):** إدارة طلبات الخدمة (Service Requests) من لحظة الطلب، مروراً بالقبول، ثم التنفيذ (In Progress)، وحتى الانتهاء أو الإلغاء.
5. **Messaging (`/messages` & WebSockets):** نظام محادثات فورية يربط بين العميل والمزود في غرفة دردشة آمنة مرتبطة بطلب الخدمة الخاص بهم.
6. **Reviews (`/reviews`):** يسمح للعملاء بتقييم المزودين (من 1 إلى 5 نجوم) بعد الانتهاء من الطلب بنجاح، مما يؤثر على متوسط تقييم المزود.
7. **Verification (`/verification`):** نظام يتيح للمزودين رفع وثائق إثبات الهوية أو الشهادات المهنية، ليتيح للإداريين (Admins) الموافقة عليها لمنح شارة "موثوق".

---

## ⚙️ متطلبات التشغيل (Prerequisites)
قبل تشغيل المشروع، تأكد من تثبيت البرامج التالية على جهازك:
- [Node.js](https://nodejs.org/) (إصدار 18 أو أحدث)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/) (يعمل على المنفذ الافتراضي 6379)

---

## 🔧 خطوات التثبيت والتشغيل (Installation & Setup)

**1. تثبيت الاعتماديات:**
```bash
npm install
```

**2. إعداد متغيرات البيئة (.env):**
قم بإنشاء ملف `.env` في المجلد الرئيسي (مستوحى من `.env.example`) وقم بتعديل القيم لتناسب بيئتك:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=herfa
DATABASE_PASSWORD=123456
DATABASE_NAME=herfa_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key
PORT=3000
```

**3. إنشاء قاعدة البيانات:**
تأكد من إنشاء قاعدة بيانات باسم `herfa_db` (أو الاسم الذي اخترته في ملف `.env`).
```bash
psql -U postgres -c "CREATE DATABASE herfa_db;"
```

**4. تشغيل السيرفر في وضع التطوير (Development):**
```bash
npm run dev
```

عند عمل السيرفر بنجاح، يمكنك الوصول إلى الـ API على الرابط التالي:
`http://localhost:3000`

---

## 📚 توثيق الـ API (Swagger Documentation)
النظام يحتوي على توثيق تفاعلي مدمج لجميع الـ Endpoints باستخدام Swagger.
بعد تشغيل السيرفر، يمكنك زيارة الرابط التالي لاختبار جميع المسارات (Routes) وتجربتها:

👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

---

## 📂 هيكلة الملفات (Directory Structure)
- `src/modules/`: يحتوي على جميع الخصائص المفصولة (Auth, Jobs, Providers, ...).
- `src/shared/`: يحتوي على الأدوات المشتركة (Guards, Zod Pipes, Decorators, Types, Schemas).
- `src/config/`: الإعدادات المركزية للتطبيق (Environment variables validation).
- `src/database/`: إعدادات الاتصال بـ TypeORM.
- `documentation/`: شروحات تفصيلية ورسومات توضيحية (Flowcharts) لكل ميزة في التطبيق.

---
*تم بناء هذا الباك-إند بكفاءة ليكون قابلًا للتوسع مستقبلاً ليدعم خواص متقدمة كالبحث الجغرافي (Geospatial) وخدمات الدفع.*
