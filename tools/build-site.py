#!/usr/bin/env python3

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
"""Build the syda.pages.dev site: merged catalog + all product pages + category pages.

Faithfully replicates the existing site templates (reverse-engineered from the live site).
"""
import json, os, re, html, shutil, sys

ANALYSIS = DATA
SITE = os.path.join(ROOT, "site")

CATS = [
    ("all_house_needs", "كل احتياجات المنزل", "Home essentials"),
    ("best_offers", "أفضل العروض", "Best offers"),
    ("cleaning_supplies", "مستلزمات تنظيف", "Cleaning supplies"),
    ("electronics", "إلكترونيات وأجهزة ذكية", "Electronics & smart devices"),
    ("fitness", "رياضة منزلية", "Home fitness"),
    ("furniture_outdoor", "أثاث خارجي", "Outdoor furniture"),
    ("home_appliances", "أجهزة منزلية", "Home appliances"),
    ("home_improvement", "تحسينات منزلية", "Home improvement"),
    ("home_storage", "تخزين منزلي", "Home storage"),
    ("natural_beauty", "الجمال الطبيعي", "Natural beauty"),
    ("special_car", "السيارة المميزة", "Car essentials"),
    ("toys_and_games", "ألعاب للصغار والكبار", "Toys & games"),
]
CAT_AR = {c[0]: c[1] for c in CATS}
CAT_EN = {c[0]: c[2] for c in CATS}

IMG_RE = re.compile(r"\.(jpe?g|png|webp|gif|avif)$", re.I)

def esc(v):
    return html.escape(str(v if v is not None else ""), quote=True)

def fmt(n):
    n = round(float(n) * 100) / 100
    return str(int(n)) if float(n).is_integer() else f"{n:.2f}"

def price_tiers(p):
    """Return list of (key, price, compareToPrice, isHidden) sorted by key."""
    raw = p.get("price")
    out = []
    if isinstance(raw, dict):
        for k, v in raw.items():
            if isinstance(v, dict) and isinstance(v.get("price"), (int, float)):
                out.append((k, float(v["price"]), v.get("compareToPrice"), bool(v.get("isHidden"))))
    elif isinstance(raw, (int, float)):
        out.append(("1", float(raw), None, False))
    elif isinstance(raw, str):
        try:
            out.append(("1", float(raw), None, False))
        except ValueError:
            pass
    out.sort(key=lambda t: int(t[0]) if str(t[0]).isdigit() else 0)
    return out

def price_of(p):
    """Replica of the site's priceOf(): (price, oldPrice)."""
    tiers = [t for t in price_tiers(p) if not t[3]]
    if not tiers:
        return (None, None)
    lo = min(tiers, key=lambda t: t[1])
    hi = max(tiers, key=lambda t: t[1])
    old = hi[1] if (hi is not lo and hi[1] > lo[1]) else (lo[2] or None)
    return (lo[1], old)

def meta_desc(desc):
    lines = [l.strip() for l in str(desc or "").splitlines() if l.strip()]
    joined = " ".join(lines)
    if len(joined) <= 160:
        return joined
    cut = joined[:160]
    # if we cut mid-word, drop the partial trailing word (replicates live behaviour)
    if joined[160:161] and joined[160] != " ":
        cut = cut[:cut.rfind(" ")] if " " in cut else cut
    return cut.rstrip() + " …"

def desc_paragraphs(desc):
    lines = [l.strip() for l in str(desc or "").splitlines()]
    return "".join(f"<p>{esc(l)}</p>" for l in lines if l)

def product_json_ld(p, first_price):
    imgs = [i["original"] for i in (p.get("images") or []) if IMG_RE.search(i.get("original") or "")]
    return json.dumps({
        "@context": "https://schema.org", "@type": "Product",
        "name": p.get("name") or "",
        "description": meta_desc(p.get("description")),
        "category": CAT_AR.get(p.get("category"), p.get("category") or ""),
        "image": imgs,
        "sku": p["id"],
        "offers": {"@type": "Offer", "price": int(first_price) if float(first_price).is_integer() else first_price,
                   "priceCurrency": "SAR", "availability": "https://schema.org/InStock"},
    }, ensure_ascii=False)

# ---------- product page template (faithful replica of the live site) ----------
PRODUCT_TMPL = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{meta_desc}">
<title>{name} | صيدة</title>
<meta name="theme-color" content="#06452f"><link rel="stylesheet" href="/assets/style.css"><link rel="icon" type="image/png" href="/assets/favicon.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="canonical" href="https://syda.pages.dev/products/{pid}.html">
<meta name="robots" content="index,follow">
<meta property="og:type" content="product">
<meta property="og:title" content="{name} | صيدة">
<meta property="og:description" content="{meta_desc}">
<meta property="og:image" content="{og_image}">
<script type="application/ld+json">{json_ld}</script></head>
<body>
<header></header>
<main class="wrap">
<p class="crumbs" data-cat="{cat}" data-catlabel="{cat_ar}" data-caten="{cat_en}"><a href="/">الرئيسية</a> ← <a href="/?cat={cat_url}">{cat_ar}</a> ← <span>تفاصيل المنتج</span></p>
<section class="product">
<div class="gallery">
<div class="gallery-stage">
<img id="mainImage" class="gallery-main" src="{main_img}" alt="{name}">
<button type="button" class="gal-arrow prev" aria-label="السابق">❮</button>
<button type="button" class="gal-arrow next" aria-label="التالي">❯</button>
<span class="img-count"><b id="imgIdx">1</b> / {img_count}</span>
</div>
<div class="thumbs">{thumbs}</div>
</div>
<article class="info">
<span class="cat-pill" data-cat="{cat}">{cat_ar}</span>
<h1>{name}</h1>
<div class="buybox">
<div class="price-row">
<div class="price">{price}</div>
<span class="old-price" hidden></span>
<span class="save-badge" hidden></span>
</div>
{tiers_block}
<div class="notice">شحن 28 ر.س — شحن مجاني للطلبات فوق 500 ر.س</div>
<div class="notice">الدفع عند الاستلام أو الدفع المسبق مع خصم 15%</div>
<div class="trust-row"><span>🚚 توصيل سريع</span><span>🔒 دفع آمن</span><span>↩️ إرجاع خلال 15 يوم</span></div>
<button class="btn add btn-lg" id="a">🛒 أضف إلى السلة</button>
</div>
<div class="description"><h2>وصف المنتج</h2>{desc_ps}</div>
</article>
</section>
<div class="mobile-buybar"><span class="price" id="mbPrice">{price}</span><button class="btn add btn-lg" onclick="addProduct()">🛒 أضف إلى السلة</button></div>
<section class="related" id="related">
<h2>منتجات مشابهة</h2>
<div class="grid" id="relatedGrid"><noscript>{noscript_cards}</noscript></div>
</section>
</main>
<section class="featurestrip">
<div class="feature"><div class="icon">🚚</div><b>شحن مجاني</b><span>توصيل مجاني للطلبات فوق 500 ر.س</span></div>
<div class="feature"><div class="icon">💰</div><b>دفع عند الاستلام</b><span>ادفع نقداً عند استلام طلبك بكل ثقة</span></div>
<div class="feature"><div class="icon">↩️</div><b>إرجاع 15 يوم</b><span>إرجاع واستبدال سهل خلال 15 يوماً</span></div>
<div class="feature"><div class="icon">💬</div><b>دعم سريع</b><span>فريقنا جاهز لمساعدتك في أي وقت</span></div>
</section>
<div class="order-modal" id="orderModal">
<div class="order-panel">
<button onclick="closeOrder()">×</button>
<h2>السلة وإتمام الطلب</h2>
<div id="orderItems"></div>
<hr>
<input id="customerName" placeholder="الاسم الكامل">
<input id="customerPhone" placeholder="رقم الهاتف">
<input id="customerCity" placeholder="المدينة">
<textarea id="customerAddress" rows="3" placeholder="العنوان بالتفصيل"></textarea>
<select id="payment"><option>الدفع عند الاستلام</option><option>الدفع المسبق مع خصم 15%</option></select>
<button class="btn" id="confirm">تأكيد الطلب</button>
</div>
</div>
<div class="lightbox" id="lightbox" onclick="__closeZoom()"><img alt=""></div>
<footer class="site-footer">
<img src="/assets/logo.png" alt="صيدة">
<div>صيدة — تسوق بثقة</div>
</footer>
<script>
const product = {product_json};
window.__imgs=product.images.filter(im=>/\\.(jpe?g|png|webp|gif|avif)$/i.test(im.original||'')).map(im=>im.medium);let __cur=0;
function setImage(src){{const i=window.__imgs.indexOf(src);__show(i<0?0:i)}}
function __show(i){{__cur=i;const m=document.getElementById('mainImage');if(m)m.src=window.__imgs[__cur]||m.src;document.querySelectorAll('.thumbs img').forEach((x,k)=>x.classList.toggle('active',k===__cur));const c=document.getElementById('imgIdx');if(c)c.textContent=(__cur+1)+' / '+window.__imgs.length}}
function __step(d){{__show((__cur+d+window.__imgs.length)%window.__imgs.length)}}
function __openZoom(){{const lb=document.getElementById('lightbox');if(!lb||!window.__imgs.length)return;const im=lb.querySelector('img');if(im)im.src=window.__imgs[__cur]||'';lb.style.display='flex'}}
function __closeZoom(){{const lb=document.getElementById('lightbox');if(lb)lb.style.display='none'}}
const __tiers=product.priceTiers||((product.price&&typeof product.price==='object')?product.price:(Number.isFinite(Number(product.price))?{{'1':{{price:Number(product.price)}}}}:{{}}));
const __tKeys=Object.keys(__tiers).filter(k=>!((__tiers[k]||{{}}).isHidden)).sort((a,b)=>Number(a)-Number(b));
let __tier=__tKeys[0]||'1';
const __isEn=()=>localStorage.getItem('sayda-lang')==='en';
const __fmt=n=>{{const v=Math.round(Number(n)*100)/100;return (Number.isInteger(v)?String(v):v.toFixed(2))+' '+(__isEn()?'SAR':'ر.س')}};
function __renderPrice(){{const t=__tiers[__tier]||{{}};let unit=Number(t.price);if(!isFinite(unit)||!unit)unit=Number(product.price)||0;const old=Number(t.compareToPrice)||0;product.price=unit;
const p=document.querySelector('.info .price');if(p)p.textContent=unit>0?__fmt(unit):(__isEn()?'Price on request':'السعر عند الطلب');
const oe=document.querySelector('.old-price'),se=document.querySelector('.save-badge');
if(old>unit&&unit>0){{if(oe){{oe.hidden=false;oe.textContent=__fmt(old)}}if(se){{se.hidden=false;se.textContent=(__isEn()?'Save ':'وفر ')+Math.round((1-unit/old)*100)+'%'}}}}
else{{if(oe)oe.hidden=true;if(se)se.hidden=true}}
const q=Math.max(1,Number(__tier)||1);const tv=document.getElementById('totalVal');if(tv)tv.textContent=__fmt(unit*q);const mb=document.getElementById('mbPrice');if(mb)mb.textContent=unit>0?__fmt(unit):'';
document.querySelectorAll('.tier-chip').forEach(ch=>ch.classList.toggle('active',ch.dataset.tier===__tier));}}
function __pickTier(k){{__tier=String(k);__renderPrice()}}
let cart=(function(){{try{{const raw=JSON.parse(localStorage.getItem('sayda-cart')||'[]');const out=(Array.isArray(raw)?raw:[]).map(x=>{{if(!x)return x;if(x.price!=null&&typeof x.price==='object'){{const t=Object.values(x.price).filter(v=>v&&typeof v.price==='number');if(t.length){{const lo=t.reduce((a,b)=>a.price<b.price?a:b);return{{id:x.id,name:x.name,nameEn:x.nameEn||x.name,price:lo.price,qty:x.qty||1}}}}}}return x}}).filter(x=>x&&Number.isFinite(Number(x.price)));return out}}catch(e){{return[]}}}})();
function save(){{localStorage.setItem('sayda-cart',JSON.stringify(cart));const n=cart.reduce((a,x)=>a+(x.qty||1),0);document.querySelectorAll('#count,[data-count]').forEach(e=>e.textContent=n)}}
function openOrder(){{const m=document.getElementById('orderModal');if(m)m.style.display='flex';renderOrder()}}
function closeOrder(){{const m=document.getElementById('orderModal');if(m)m.style.display='none'}}
function renderOrder(){{const box=document.getElementById('orderItems');if(!box)return;box.innerHTML=cart.length?cart.map((x,i)=>'<div class="notice"><b>'+x.name+'</b><div class="qty"><button onclick="changeQty('+i+',-1)">−</button><span>'+(x.qty||1)+'</span><button onclick="changeQty('+i+',1)">+</button><button onclick="cart.splice('+i+',1);save();renderOrder()">حذف</button></div></div>').join(''):'السلة فارغة'}}
function changeQty(i,n){{cart[i].qty=Math.max(1,(cart[i].qty||1)+n);save();renderOrder()}}
function addProduct(){{const q=Math.max(1,Number(__tier)||1);const t=(product.price&&typeof product.price==='object')?(product.price[__tier]||product.price['1']||{{}}):{{}};let u=Number(t.price);if(!isFinite(u)||!u)u=Number(product.price)||0;if(!u){{alert(__isEn()?'This product is priced on request. Please contact us.':'هذا المنتج سعره عند الطلب. تواصل معنا لمعرفة السعر.');return}}let x={{id:product.id,name:product.name,nameEn:product.nameEn||product.name,price:u,qty:q}};const old=cart.find(y=>y.id===x.id);if(old)old.qty=(old.qty||1)+q;else cart.push(x);save();openOrder()}}
window.openCart=openOrder;
const aBtn=document.getElementById('a');if(aBtn)aBtn.onclick=addProduct;
const conf=document.getElementById('confirm');if(conf)conf.onclick=()=>{{const n=document.getElementById('customerName'),ph=document.getElementById('customerPhone'),ad=document.getElementById('customerAddress');if(!n||!ph||!ad||!n.value||!ph.value||!ad.value){{alert('يرجى إكمال بيانات الطلب');return}}alert('تم حفظ الطلب تجريبيًا. يلزم ربط Backend لإرساله فعليًا.')}};
const om=document.getElementById('orderModal');if(om)om.onclick=e=>{{if(e.target===om)closeOrder()}};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));
window.__related = {related_json};
function __renderRelated(){{const wrap=document.getElementById('relatedGrid');if(!wrap)return;const en=__isEn();const t=document.querySelector('.related h2');if(t)t.textContent=en?'You may also like':'منتجات مشابهة';if(!window.__related||!window.__related.length){{wrap.innerHTML='';const sec=document.getElementById('related');if(sec)sec.style.display='none';return}}
wrap.innerHTML=window.__related.map(r=>{{const nm=en?(r.nameEn||r.name):r.name;const link='/products/'+encodeURIComponent(r.id)+'.html';return '<article class="card"><div class="card-media"><a class="card-img" href="'+link+'"><img loading="lazy" src="'+esc(r.medium)+'" alt="'+esc(nm)+'">'+(r.save?'<span class="save-chip">'+r.save+'%</span>':'')+'</a><button class="add quick-add" data-id="'+esc(r.id)+'" aria-label="'+(en?'Add to cart':'أضف للسلة')+'">+</button></div><div class="body"><h3><a href="'+link+'">'+esc(nm)+'</a></h3><div class="price">'+__fmt(r.price)+'</div><div class="card-actions"><a class="btn" href="'+link+'">'+(en?'View details':'عرض التفاصيل')+'</a><button class="add" data-id="'+esc(r.id)+'">'+(en?'Add to cart':'أضف للسلة')+'</button></div></div></article>'}}).join('');}}
function __wireRelated(){{const wrap=document.getElementById('relatedGrid');if(!wrap)return;wrap.onclick=e=>{{const b=e.target.closest('.add');if(!b)return;const r=(window.__related||[]).find(x=>x.id===b.dataset.id);if(!r)return;const u=Number(r.price)||0;if(!u){{alert(__isEn()?'This product is priced on request. Please contact us.':'هذا المنتج سعره عند الطلب. تواصل معنا لمعرفة السعر.');return}}const old=cart.find(y=>y.id===r.id);if(old)old.qty=(old.qty||1)+1;else cart.push({{id:r.id,name:r.name,nameEn:r.nameEn||r.name,price:u,qty:1}});save();openOrder();}}}}
function __renderCrumbs(){{const c=document.querySelector('.crumbs');if(!c)return;const en=__isEn(),home=en?'Home':'الرئيسية',det=en?'Product details':'تفاصيل المنتج';const cat=encodeURIComponent(c.dataset.cat||'');const lab=en?(c.dataset.caten||c.dataset.catlabel):c.dataset.catlabel;c.innerHTML='<a href="/">'+home+'</a> ← '+(cat?'<a href="/?cat='+cat+'">'+lab+'</a> ← ':'')+'<span>'+det+'</span>';}}
function __initPage(){{__show(0);__renderPrice();__renderCrumbs();__renderRelated();__wireRelated();
const pv=document.querySelector('.gal-arrow.prev');if(pv)pv.onclick=()=>__step(-1);
const nx=document.querySelector('.gal-arrow.next');if(nx)nx.onclick=()=>__step(1);
const m=document.getElementById('mainImage');if(m)m.onclick=__openZoom;
document.querySelectorAll('.tier-chip').forEach(ch=>ch.onclick=()=>__pickTier(ch.dataset.tier));}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',__initPage);else __initPage();
window.addEventListener('languagechange',()=>{{__renderPrice();__renderCrumbs();__renderRelated()}});
save();
</script>
<script src="/assets/site-ui.js"></script>
<script src="/assets/chat.js" defer></script>
</body>
</html>
"""

CATEGORY_TMPL = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="{cat_ar} من متجر صيدة — منتجات مختارة بعناية بأسعار منافسة."><meta name="theme-color" content="#06452f"><title>{cat_ar} | صيدة</title><link rel="canonical" href="https://syda.pages.dev/categories/{cat}.html"><meta property="og:type" content="website"><meta property="og:site_name" content="صيدة"><meta property="og:title" content="{cat_ar} | صيدة"><meta property="og:description" content="{cat_ar} من متجر صيدة — منتجات مختارة بعناية بأسعار منافسة."><meta property="og:url" content="https://syda.pages.dev/categories/{cat}.html"><meta property="og:image" content="https://syda.pages.dev/assets/logo.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/png" href="/assets/favicon.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><link rel="stylesheet" href="/assets/style.css"></head><body><header></header><main class="wrap"><section class="hero"><h1 id="heroTitle">{cat_ar}</h1><p id="heroSubtitle">تصفح منتجات هذا القسم بالكامل</p><div class="hero-chips"><span data-ar="🚚 توصيل سريع لكل المدن" data-en="🚚 Fast nationwide delivery">🚚 توصيل سريع لكل المدن</span><span data-ar="💰 الدفع عند الاستلام" data-en="💰 Cash on delivery">💰 الدفع عند الاستلام</span><span data-ar="⭐ منتجات مضمونة" data-en="⭐ Guaranteed products">⭐ منتجات مضمونة</span></div></section><h2 id="categoriesTitle">الأقسام</h2><section class="cats-tiles" id="catsTiles"></section><div class="catalog-controls"><div class="catselect">🛍️ <label id="categoryLabel" for="catselect">اختر قسمًا</label><select id="catselect"><option value="">كل الأقسام</option></select></div><label class="sort-control" for="sort"><span id="sortLabel">ترتيب النتائج</span><select id="sort"><option value="default">الترتيب الافتراضي</option><option value="low">السعر: من الأقل للأعلى</option><option value="high">السعر: من الأعلى للأقل</option><option value="name">الاسم</option></select></label></div><h2 id="products"><span id="productsTitle">المنتجات</span> <small id="shown"></small></h2><section class="grid" id="grid" aria-live="polite"></section><nav id="pagination" class="pagination" aria-label="ترقيم صفحات المنتجات"></nav></main><button class="cartbar" onclick="openCart()">السلة (<span data-count>0</span>)</button><div class="modal" id="modal"><div class="panel"><button onclick="closeCart()">×</button><h2>السلة والطلب</h2><div id="cart"></div></div></div><section class="featurestrip"><div class="feature"><div class="icon">🚚</div><b>شحن مجاني</b><span>توصيل مجاني للطلبات فوق 500 ر.س</span></div><div class="feature"><div class="icon">💰</div><b>دفع عند الاستلام</b><span>ادفع نقداً عند استلام طلبك بكل ثقة</span></div><div class="feature"><div class="icon">↩️</div><b>إرجاع 15 يوم</b><span>إرجاع واستبدال سهل خلال 15 يوماً</span></div><div class="feature"><div class="icon">💬</div><b>دعم سريع</b><span>فريقنا جاهز لمساعدتك في أي وقت</span></div></section><footer class="site-footer"></footer><script>window.SAYDA_CATEGORY='{cat}';</script><script src="/assets/app.js"></script><script src="/assets/site-ui.js"></script><script src="/assets/chat.js" defer></script></body></html>"""


def _num(x):
    """Return int when integral (matches original JSON integers), else float."""
    if x is None:
        return None
    f = float(x)
    return int(f) if f.is_integer() else f


def related_compact(p):
    price, old = price_of(p)
    save_pct = round((1 - price / old) * 100) if (price and old and old > price) else None
    imgs = [i for i in (p.get("images") or []) if IMG_RE.search(i.get("original") or "")]
    return {
        "id": p["id"], "name": p.get("name") or "", "nameEn": p.get("nameEn") or p.get("name") or "",
        "price": _num(price), "medium": (imgs[0].get("medium") if imgs else ""), "save": save_pct,
    }


def build_product_page(p, related):
    cat = p.get("category") or ""
    cat_ar = CAT_AR.get(cat, cat)
    cat_en = CAT_EN.get(cat, cat)
    tiers = [t for t in price_tiers(p) if not t[3]]
    first_price = tiers[0][1] if tiers else None
    imgs = [i for i in (p.get("images") or []) if IMG_RE.search(i.get("original") or "")]
    name = p.get("name") or ""

    # tier chips block (goes between price-row and notices; empty string when single tier)
    tiers_block = ""
    if len(tiers) > 1:
        chips = []
        base = tiers[0][1]
        for k, price, cmp_to, _hid in tiers:
            ref = max(base, cmp_to or 0)
            pct = round((1 - price / ref) * 100) if (ref > price) else None
            em = f"<em>وفر {pct}%</em>" if pct else "<em></em>"
            chips.append(f'<button type="button" class="tier-chip" data-tier="{k}"><small>{int(k) if str(k).isdigit() else k} × {fmt(price)} ر.س</small>{em}</button>')
        tiers_block = ('<div class="tiers"><div class="tiers-title">الكمية والسعر (خصم على الكميات)</div>'
                       '<div class="tier-chips">' + "".join(chips) + '</div></div>\n'
                       f'<div class="total-line">الإجمالي (للمنتج): <b id="totalVal">{fmt(tiers[0][1])} ر.س</b></div>\n')

    thumbs = "".join(f'<img src="{esc(i["medium"])}" onclick="setImage(this.src)" alt="{esc(name)}" loading="lazy">' for i in imgs)

    noscript_cards = "".join(
        f'<article class="card"><div class="card-media"><a class="card-img" href="/products/{esc(r["id"])}.html">'
        f'<img src="{esc(r["medium"])}" alt="{esc(r["name"])}">'
        + (f'<span class="save-chip">{r["save"]}%</span>' if r.get("save") else "")
        + f'</a></div><div class="body"><h3><a href="/products/{esc(r["id"])}.html">{esc(r["name"])}</a></h3>'
          f'<div class="price">{fmt(r["price"])} ر.س</div><a class="btn" href="/products/{esc(r["id"])}.html">عرض التفاصيل</a></div></div></article>'
        for r in related)

    product_obj = dict(p)
    price_str = fmt(first_price) + " ر.س" if first_price else "السعر عند الطلب"

    return PRODUCT_TMPL.format(
        meta_desc=esc(meta_desc(p.get("description"))),
        name=esc(name),
        pid=esc(p["id"]),
        og_image=esc(imgs[0]["medium"] if imgs else "/assets/logo.png"),
        json_ld=product_json_ld(p, first_price or 0),
        cat=esc(cat), cat_ar=esc(cat_ar), cat_en=esc(cat_en), cat_url=esc(cat),
        main_img=esc(imgs[0]["medium"] if imgs else "/assets/logo.png"),
        img_count=len(imgs),
        thumbs=thumbs,
        price=price_str,
        tiers_block=tiers_block,
        desc_ps=desc_paragraphs(p.get("description")),
        noscript_cards=noscript_cards,
        product_json=json.dumps(product_obj, ensure_ascii=False, separators=(",", ":")),
        related_json=json.dumps(related, ensure_ascii=False, separators=(",", ":")),
    )


def main():
    dukan = json.load(open(f"{ANALYSIS}/dukan-catalog.json", encoding="utf-8"))
    old_site = {p["id"]: p for p in json.load(open(f"{ANALYSIS}/products.json", encoding="utf-8"))}
    translations = json.load(open(f"{ANALYSIS}/translations.json", encoding="utf-8"))

    # ---- merge catalog (Dukan order = source of truth) ----
    catalog = []
    n_new, n_retrans, n_kept, n_fallback = 0, 0, 0, 0
    for p in dukan:
        pid = p["id"]
        entry = dict(p)
        if pid in translations:
            entry["nameEn"] = translations[pid]["nameEn"]
            entry["descriptionEn"] = translations[pid]["descriptionEn"]
            n_new += 1 if pid not in old_site else 0
            n_retrans += 1 if pid in old_site else 0
        elif pid in old_site:
            entry["nameEn"] = old_site[pid].get("nameEn") or old_site[pid].get("name") or ""
            entry["descriptionEn"] = old_site[pid].get("descriptionEn") or ""
            n_kept += 1
        else:
            entry["nameEn"] = p.get("name") or ""          # fallback: Arabic
            entry["descriptionEn"] = p.get("description") or ""
            n_fallback += 1
        catalog.append(entry)

    print(f"Catalog: {len(catalog)} products | translated now: {n_new} new + {n_retrans} re-trans | kept old EN: {n_kept} | fallback AR: {n_fallback}")
    bad = [p["id"] for p in catalog if not p.get("name")][:5]
    if bad:
        print("WARNING products without name:", bad)

    # ---- products.json ----
    os.makedirs(f"{SITE}/assets", exist_ok=True)
    with open(f"{SITE}/assets/products.json", "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False)
    print(f"products.json: {os.path.getsize(f'{SITE}/assets/products.json')/1e6:.1f} MB")

    # ---- product pages ----
    by_cat = {}
    for p in catalog:
        by_cat.setdefault(p.get("category") or "", []).append(p)

    os.makedirs(f"{SITE}/products", exist_ok=True)
    for i, p in enumerate(catalog):
        same_cat = [q for q in by_cat.get(p.get("category") or "", []) if q["id"] != p["id"]]
        related = [related_compact(q) for q in same_cat[:8] if (q.get("images") or [{}])[0].get("medium") and price_of(q)[0]]
        html_page = build_product_page(p, related)
        with open(f"{SITE}/products/{p['id']}.html", "w", encoding="utf-8") as f:
            f.write(html_page)
        if (i + 1) % 500 == 0:
            print(f"  product pages: {i+1}/{len(catalog)}")
    print(f"product pages: {len(catalog)} done")

    # ---- category pages ----
    os.makedirs(f"{SITE}/categories", exist_ok=True)
    for cid, cat_ar, _cat_en in CATS:
        with open(f"{SITE}/categories/{cid}.html", "w", encoding="utf-8") as f:
            f.write(CATEGORY_TMPL.format(cat=cid, cat_ar=cat_ar))
    print("category pages: 12 done")

    # ---- inject chat.js into static pages (index, legal, 404, thank-you) ----
    inject_targets = [
        f"{SITE}/index.html", f"{SITE}/404.html", f"{SITE}/thank-you",
        f"{SITE}/legal/privacy-terms.html", f"{SITE}/legal/shipping-returns.html", f"{SITE}/legal/contact.html",
    ]
    for path in inject_targets:
        with open(path, encoding="utf-8") as f:
            doc = f.read()
        if "/assets/chat.js" in doc:
            continue
        if "</body>" in doc:
            doc = doc.replace("</body>", '<script src="/assets/chat.js" defer></script>\n</body>', 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write(doc)
    print("chat.js injected into static pages")

    # ---- catalog index for the chatbot worker (compact, with desc snippets) ----
    idx = []
    for p in catalog:
        price, old = price_of(p)
        imgs = [i for i in (p.get("images") or []) if IMG_RE.search(i.get("original") or "")]
        desc = " ".join(l.strip() for l in str(p.get("description") or "").splitlines() if l.strip())[:300]
        idx.append([p["id"], p.get("name") or "", p.get("nameEn") or "",
                    _num(price), _num(old), p.get("category") or "",
                    (imgs[0].get("thumbnail") or imgs[0].get("medium") or "") if imgs else "", desc])
    with open(f"{ANALYSIS}/chat-catalog-index.json", "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False)
    print(f"chat catalog index: {len(idx)} entries, {os.path.getsize(f'{ANALYSIS}/chat-catalog-index.json')/1e6:.2f} MB")


if __name__ == "__main__":
    main()
