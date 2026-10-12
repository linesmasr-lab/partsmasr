# PartsMasr

موقع قطع غيار للعربيات في مصر. المستخدم بيختار عربيته (الماركة ثم الموديل ثم السنة ثم الموتور) فتظهرله القطع اللي بتركب عليها بس.

**التقنيات:** React 19 + Vite · Node (Express 5) · SQLite (better-sqlite3)

## التشغيل على جهازك

```bash
npm install
npm run dev        # الموقع على http://localhost:5173 والـ API على 3001
```

- لوحة التحكم على `/admin`، وكلمة السر في وضع التطوير هي `admin123`.
- لو عاوزة ترجّعي الداتا التجريبية زي ما كانت: `npm run seed` (الأمر ده بيمسح كل القطع والطلبات).

## الرفع على Railway

1. ارفعي المشروع على GitHub، وبعدين في Railway اختاري **New Project ← Deploy from GitHub repo**.
2. **أضيفي Volume للخدمة واعمليله Mount على `/data`.** من غير الخطوة دي قاعدة البيانات والصور المرفوعة هيتمسحوا مع كل deploy، وممكن كمان يطلعلك خطأ إن قاعدة البيانات readonly.
3. اكتبي الـ Variables دي:

| المتغير | القيمة |
|---|---|
| `NODE_ENV` | `production` |
| `DATA_DIR` | `/data` |
| `ADMIN_PASSWORD` | كلمة سر قوية للوحة التحكم |
| `SESSION_SECRET` | نص عشوائي طويل (مثلًا ناتج `openssl rand -hex 32`) |
| `WHATSAPP_NUMBER` | رقم الواتساب بالصيغة الدولية من غير + (مثلًا `2010xxxxxxxx`) |

4. أمر الـ Build: `npm run build`. وأمر الـ Start: `npm start`. Railway بيحدد `PORT` لوحده.

أول مرة السيرفر يشتغل، بيعمل الكتالوج التجريبي لوحده لو قاعدة البيانات فاضية.

## هيكل المشروع

```
server/
  db.js       الجداول (makes, models, vehicles, categories, parts, part_fitments, orders)
  seed.js     الداتا التجريبية (أسعار وبراندات وأرقام قطع للعرض بس)
  index.js    الـ API + لوحة التحكم + تقديم ملفات الموقع
src/
  pages/      Home, Catalog (الشجرة), Shop (بحث/سلة/طلب), Admin
  components/ Layout, VehicleSelector, Tree, PartGroup
public/parts/ صور مؤقتة للقطع (SVG)، اتغيّر من لوحة التحكم
```

## التوافق (Fitment)

كل قطعة متربطة بعربيات محددة في جدول `part_fitments`، يعني موديل + سنة + موتور. من لوحة التحكم بتضيفي التوافق كنطاق: الموديل، ومن سنة لحد سنة، وموتور معين أو كل المواتير.

## قبل الإطلاق الحقيقي

- شيلي الشريط اللي بيقول "نسخة تجريبية" (`demo: true` في `server/index.js`)، وحطي داتا التجار الحقيقية مكان الداتا التجريبية.
- اكتبي سياسة الإرجاع ومصاريف الشحن الحقيقية في صفحة `/policy`.
