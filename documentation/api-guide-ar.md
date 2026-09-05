# دليل API بالعربي

هذا الملف يشرح الـAPI الخاصة بمنصة تمكين بطريقة عملية: كل endpoint تستخدمه
في أي وقت، من يملك صلاحية استخدامه، وما هي البيانات التي يرسلها.

## قبل البداية: ما هو الـAccess Token؟

بعد تسجيل الدخول، يرجع السيرفر `accessToken` و`refreshToken`.

- `accessToken`: يثبت للسيرفر هوية المستخدم في كل request محمي. ضعه في
  Header بالشكل التالي:

  ```text
  Authorization: Bearer <accessToken>
  ```

- `refreshToken`: يستخدم فقط في `/auth/refresh` للحصول على توكنات جديدة عند
  انتهاء صلاحية الـaccess token. لا ترسله مع بقية الـrequests.

كل الردود الناجحة تكون بهذا الشكل:

```json
{
  "success": true,
  "data": {}
}
```

لذلك في Postman ستجد القيمة الحقيقية دائمًا داخل `data`.

## الأدوار (Roles)

- `customer`: العميل الذي يطلب خدمة.
- `provider`: مزود الخدمة الذي يستقبل وينفذ الطلبات.
- `admin`: مدير المنصة؛ يراجع مستندات التحقق ويرى كل الطلبات.

---

## 1. Auth — الحساب وتسجيل الدخول

### `POST /auth/register`

ينشئ حسابًا جديدًا. يمكن إنشاء `customer` أو `provider` فقط من هذا endpoint.
إنشاء `admin` ممنوع لحماية النظام.

مثال body:

```json
{
  "email": "customer@example.com",
  "password": "StrongP@ss123",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "phone": "+201000000001",
  "role": "customer"
}
```

يرجع بيانات المستخدم مع access وrefresh tokens مباشرة.

### `POST /auth/login`

يسجل دخول حساب موجود باستخدام البريد وكلمة المرور.

```json
{
  "email": "customer@example.com",
  "password": "StrongP@ss123"
}
```

إذا كانت البيانات غير صحيحة يرجع `401 Unauthorized` برسالة عامة، ولا يوضح إن
كانت المشكلة في البريد أو كلمة المرور.

### `POST /auth/refresh`

يستبدل refresh token قديمًا بزوج جديد من التوكنات. هذا يسمى **Refresh Token
Rotation**: بعد الاستخدام لا يعود التوكن القديم صالحًا.

```json
{
  "refreshToken": "<refreshToken>"
}
```

### `POST /auth/logout`

يلغي جلسات الـrefresh للمستخدم الحالي. يحتاج `Authorization` header. بعده
لا يمكن استخدام refresh token للحصول على access token جديد.

---

## 2. Providers — بيانات الحساب ومزود الخدمة

حساب المستخدم شيء، وProvider Profile شيء آخر. المستخدم ذو role `provider`
ينشئ profile يضم بيانات عمله وتخصصاته؛ لهذا لا يمكن للـcustomer إنشاء profile.

### `GET /users/me`

يعرض بيانات الحساب المسجل حاليًا. كلمة `me` معناها لا تضع ID في الرابط؛
السيرفر يعرف المستخدم من الـaccess token.

### `PATCH /users/me`

يعدل بيانات الحساب الحالي فقط، مثل الاسم أو الهاتف.

```json
{
  "firstName": "Ahmed",
  "phone": "+201000000099"
}
```

### `POST /users/me/provider-profile`

لـprovider فقط. ينشئ صفحة العمل الخاصة به. بعد نجاح هذا الطلب احفظ `data.id`
في Postman باسم `providerId` لأنه يستخدم عند إنشاء Job.

```json
{
  "businessName": "Ahmed Plumbing",
  "bio": "Professional plumber with several years of experience.",
  "category": "plumbing",
  "categories": ["plumbing"],
  "hourlyRate": 150,
  "city": "Cairo",
  "latitude": 30.0444,
  "longitude": 31.2357
}
```

`category` هو التخصص الرئيسي، و`categories` قائمة بالتخصصات التي يقدمها.
الإحداثيات تحفظ حاليًا كمعلومة فقط؛ يمكن استخدام PostGIS لاحقًا للبحث بالقرب
من موقع العميل.

### `PATCH /users/me/provider-profile`

لـprovider فقط. يعدّل profile الخاص بصاحب التوكن، وليس profile يختاره من URL؛
وهذا يمنع تعديل بيانات مزود آخر.

### `GET /providers`

Public endpoint، لا يحتاج تسجيل دخول. يعرض مزودي الخدمات النشطين. يمكن إضافة
مثلًا `?category=plumbing&page=1&limit=20`.

### `GET /providers/:id`

Public endpoint يعرض بيانات Provider Profile واحد. بدّل `:id` بالـ`providerId`:

```text
/providers/8a1cfb2d-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 3. Discovery — البحث عن مزودين

### `GET /search`

Public endpoint للبحث والفلترة، ولا يملك جدولًا خاصًا به؛ يستعلم من Provider
Profiles الموجودة. مثال:

```text
/search?category=plumbing&city=Cairo&minRating=4&maxPrice=200&page=1&limit=20
```

معاني الـfilters:

- `category`: التخصص، مثل `plumbing` أو `cleaning`.
- `city`: المدينة.
- `minRating`: أقل تقييم مقبول من 0 إلى 5.
- `maxPrice`: أكبر سعر بالساعة.
- `page` و`limit`: pagination لتقسيم النتائج.

---

## 4. Jobs — طلبات الخدمة

الـJob هو طلب العميل لمزود الخدمة. وهو الجزء الأساسي في النظام، لأن الشات
والتقييم يعتمدان عليه.

### `POST /providers/:id/request`

لـcustomer فقط. ينشئ طلبًا للمزود صاحب `providerId` الموجود في الرابط.

```json
{
  "title": "Fix kitchen sink leak",
  "description": "The kitchen sink has been leaking for two days and needs urgent repair.",
  "category": "plumbing",
  "budget": 150,
  "scheduledAt": "2026-10-10T14:00:00Z"
}
```

احفظ `data.id` من الرد باسم `jobId`.

### `GET /requests`

يعرض قائمة الطلبات حسب الدور:

- العميل يرى طلباته فقط.
- الـprovider يرى الطلبات الموجهة إلى Provider Profile الخاص به فقط.
- الـadmin يرى كل الطلبات.

يمكن إضافة `?status=pending&page=1&limit=20`.

### `GET /requests/:id`

يعرض تفاصيل Job واحدة، لكن ليس لأي مستخدم يعرف الـID. السيرفر يتحقق أن صاحب
التوكن هو العميل صاحب الطلب أو الـprovider المرتبط به أو admin. هذا يمنع IDOR
(وصول مستخدم إلى بيانات طلب شخص آخر بمجرد تخمين الـID).

### `PATCH /requests/:id/status`

يغير حالة الطلب. مثال:

```json
{ "status": "accepted" }
```

الحالات المسموحة:

```text
pending → accepted → in_progress → completed
   │         │            │
   └─────────┴────────────┴→ cancelled
```

- العميل يقدر يلغي طلبه فقط.
- الـprovider المرتبط بالطلب يقدر يقبل، يبدأ، ينهي، أو يلغي حسب المرحلة.
- الـadmin يقدر يتدخل، لكن لا يستطيع كسر الترتيب؛ مثلًا لا يمكن `pending → completed`.

---

## 5. Messaging — المحادثة

### `GET /messages/:jobId`

يعرض تاريخ محادثة Job. العميل والـprovider المرتبطان بالـJob فقط يستطيعان
قراءته. مثال:

```text
/messages/<jobId>?page=1&limit=50
```

### Socket.IO: `/chat`

هذا للشات الفوري؛ الرسالة تظهر للطرف الآخر بدون إعادة تحميل الصفحة.

1. اتصل بـ`{{socketUrl}}/chat` وأرسل:

   ```json
   { "auth": { "token": "<accessToken>" } }
   ```

2. أرسل event باسم `joinRoom`:

   ```json
   { "jobId": "<jobId>" }
   ```

3. أرسل رسالة عبر event `sendMessage`:

   ```json
   { "jobId": "<jobId>", "content": "Hello, when can you arrive?" }
   ```

السيرفر يتحقق من JWT عند الاتصال، ثم يتحقق أن المستخدم participant في الـJob
قبل دخوله الغرفة أو حفظ/إرسال رسالة.

---

## 6. Reviews — التقييمات

### `POST /reviews`

لـcustomer فقط، ويعمل بعد اكتمال الـJob فقط.

```json
{
  "jobId": "<jobId>",
  "rating": 5,
  "comment": "Excellent work and clear communication."
}
```

القواعد:

- الـJob يجب أن يكون `completed`.
- العميل يجب أن يكون صاحب الـJob.
- تقييم واحد فقط لكل Job.
- `rating` من 1 إلى 5.
- `comment` اختياري.

بعد إنشاء التقييم، يحسب النظام متوسط تقييم الـprovider من جديد.

### `GET /reviews/:providerId`

Public endpoint يعرض تقييمات مزود خدمة ومتوسط تقييمه.

---

## 7. Verification — توثيق مزود الخدمة

### `POST /verification/submit`

لـprovider فقط. يرفع رابط مستند؛ رفع الملف نفسه يتم عبر خدمة تخزين خارجية في
مرحلة لاحقة، بينما هذا endpoint يحفظ رابط المستند وحالة مراجعته.

```json
{
  "documentType": "id_card",
  "documentUrl": "https://example.com/documents/id-card.pdf"
}
```

الأنواع المدعومة: `id_card` و`passport` و`certificate` و`other`.

### `GET /verification/status`

لـprovider فقط. يرجع جميع مستنداته وهل الحساب موثق (`isVerified`) أم لا.

### `GET /verification/pending`

للـadmin فقط. يعرض المستندات الموجودة في انتظار المراجعة.

### `PATCH /verification/:id/review`

للـadmin فقط. يقبل أو يرفض مستندًا:

```json
{ "status": "approved" }
```

أو:

```json
{
  "status": "rejected",
  "rejectionReason": "Document is blurry. Please upload a clear copy."
}
```

سبب الرفض إجباري عند اختيار `rejected`. عند الموافقة على مستند، يتم وضع
`isVerified: true` على حساب الـprovider وProvider Profile الخاص به.

## ترتيب التجربة في Postman

استخدم [Tamken-API.postman_collection.json](postman/Tamken-API.postman_collection.json)
ثم نفذ بالترتيب:

1. Register Customer ثم Register Provider.
2. Create My Provider Profile.
3. Customer Creates Request.
4. Provider Accepts ثم Starts ثم Completes Request.
5. Customer Creates Review.
6. جرّب Messaging History أو Socket.IO.
7. Provider Submits Document؛ وراجعها فقط إذا كان عندك Admin token جاهز.
