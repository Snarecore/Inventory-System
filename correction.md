১. অপ্রয়োজনীয় API Hit ও ক্যাশ অপচয় (Unwanted API Calls & Refetching)

কোডবেসে এমন কিছু লজিক আছে যা প্রতি ক্লিকে বা পেজ লোডে ব্যাকএন্ড সার্ভারকে অহেতুক ব্যস্ত করে তোলে:

শুধুমাত্র পরবর্তী ইনভয়েস নম্বর জানার জন্য পুরো Purchase List ফেচ করা:

ফাইল: PurchaseForm.tsx
সমস্যা: ব্যবহারকারী যখনই Create Purchase পেজে ঢোকেন, পরবর্তী ইনভয়েস নম্বর (PUR-0001 ইত্যাদি) জেনারেট করার জন্য staleTime: 0, refetchOnMount: "always" দিয়ে ব্যাকএন্ডের হাজার হাজার পারচেজ ডেটা টেনে আনা হয়।
কেন স্লো হয়: শুধু একটি সাধারণ সংখ্যা জানার জন্য এত ভারী API প্রতিবার পেজ ওপেন করলেই নতুন করে ডাউনলোড হচ্ছে।

handleDeleteAPI-তে ৩ বার করে রি-ফেচ ঝড় (Triple Refetch Storm):

ফাইল: src/hooks/useApi.ts
সমস্যা: কোনো আইটেম ডিলিট করার পর কোডে লেখা আছে:
typescript
await queryClient.invalidateQueries({ refetchType: 'all' }); // ১ বার
for (const singleKey of invalidateQueryKey) {
    await queryClient.invalidateQueries({ refetchType: 'all' }); // ২ বার
    await queryClient.refetchQueries({ type: 'all' }); // ৩ বার
}
কেন স্লো হয়: একই ডেটা ৩ বার রিফেচ হচ্ছে এবং refetchType: 'all' থাকার কারণে ব্যবহারকারী যে পেজে এই মুহূর্তে নেই (ব্যাকগ্রাউন্ড পেজ), সেগুলোরও অপ্রয়োজনীয় API নেটওয়ার্কে কল হচ্ছে।

useEffect-এর ভেতর ব্লকিং Auth API কল:

ফাইল: PurchaseForm.tsx
ফর্ম মাউন্ট হওয়ার সাথে সাথে authorization-check-user সরাসরি useEffect-এর ভেতর কল হচ্ছে, যা রিঅ্যাক্ট স্টেটকে রি-রেন্ডার সাইকেলে আটকে ফেলে।

শেয়ার্ড ক্যাশের অভাব (Bank ও MFS API চার জায়গায় ডুপ্লিকেট ফেচ):

SaleForm, PurchaseForm, SalesReturnForm, PurchaseReturnForm—এই ৪টি ফর্মে ব্যাংক ও MFS ড্রপডাউন দরকার হয়।
প্রতিটিতে আলাদা আলাদাভাবে get-bank-info-list এবং mfs-user-list কুয়েরি লেখা হয়েছে। একটি সেন্ট্রালাইজড হুক না থাকায় এক পেজ থেকে অন্য পেজে গেলে ক্যাশ শেয়ার হয় না, আবার নতুন করে API কল হয়।

ব্লকিং Waterfall Fallback:

যেমন SaleForm.tsx-এ get-sales-and-return যদি খালি আসে, তবে queryFn-এর ভেতরে অপেক্ষা করে আবার দ্বিতীয় API get-sale-list কল করা হচ্ছে।
২. রি-ইউজ না করে হাজার হাজার লাইন ডুপ্লিকেশন (Missing Reusability)

কোডবেসে অনেক কম্পোনেন্ট রয়েছে যা সামান্য জেনেরিক করলেই ৮০% কোড কমে যেত:

দানবাকৃতির ৪টি ফর্ম (~৮,৮০০ লাইন কোড!):

PurchaseForm.tsx (২৬৪৭ লাইন)
SaleForm.tsx (২৪৪১ লাইন)
SalesReturnForm.tsx (১৮৫০ লাইন)
PurchaseReturnForm.tsx (১৮৫০ লাইন)
কী কী হুবহু ডুপ্লিকেট:
Bank & MFS সেকশন: ৪টি ফর্মার প্রতিটিতে ব্যাংক ড্রপডাউন, এমএফএস ড্রপডাউন, স্প্লিট পেমেন্ট স্টেট (cashAmount, bankAmount, mfsAmount, cashGiven) হুবহু কপি-পেস্ট (~৩০০ লাইন x ৪ = ১২০০ লাইন ডুপ্লিকেট)।
Line Items Table ও ক্যালকুলেশন: প্রোডাক্ট যোগ করা, কোয়ান্টিটি বাড়ানো-কমানো, ডিসকাউন্ট ও ভ্যাট হিসাব—সবগুলোর টেবিল ও লজিক আলাদা আলাদাভাবে লেখা হয়েছে।
বারকোড স্ক্যানার ও প্রোডাক্ট সার্চ: ৪টি ফর্মার প্রতিটিতে প্রোডাক্ট ড্রপডাউন ও কীবোর্ড নেভিগেশনের ২০০+ লাইন করে কোড কপি করা।

৪টি ইনভয়েস প্রিন্ট মোডাল (~১,৬০০ লাইন ডুপ্লিকেট):

SaleInvoiceModal.tsx, PurchaseInvoiceModal.tsx, SalesReturnInvoiceModal.tsx, PurchaseReturnInvoiceModal.tsx—প্রতিটি ফাইলে প্রায় ৪০০ লাইন করে কোড।
অথচ চারটির কাজই এক: কোম্পানির লোগো, নাম, ঠিকানা, টেবিল, সাবটোটাল, থার্মাল/A4 প্রিন্ট বাটন। একটি মাত্র রি-ইউজেবল <GenericInvoiceModal /> দিয়ে এই ৪টি ফাইলকে একটি ফাইলে রূপান্তর করা সম্ভব।

Stats / KPI কার্ডস:

SaleStats.tsx, PurchaseStats.tsx, SalesReturnStats.tsx, PurchaseReturnStats.tsx—সবগুলোতেই একই ডিজাইন ও লেআউট আলাদা ফাইলে তৈরি।
৩. অপ্রয়োজনীয় || || || ফলব্যাক চেইন (Fallback Hell)

আপনার এই পয়েন্টটি অত্যন্ত গুরুত্বপূর্ণ। শুধু trade ফোল্ডারেই ১৬৭টি লাইনে ৩ বা ততোধিক || ব্যবহার করা হয়েছে!

যেমন কোডে প্রায়ই দেখা যায়:

typescript
const pCode = item.productCode || item.product_code || item.pcode || item.code || "";
const pName = item.productName || item.product_name || item.name || item.title || "";
const suppId = data.supplierId || data.supplier_id || data.customerId || data.customer_id;
const total = item.grandTotal || item.grand_total || item.total || item.totalAmount || 0;
এটি কেন তৈরি হয়েছিল?

ব্যাকএন্ডের বিভিন্ন এন্ডপয়েন্ট বা কন্ট্রোলারে ডেটা ফিল্ডের নাম একরকম ছিল না (কোনোটিতে snake_case, কোনোটিতে camelCase, আবার কোনোটিতে শর্টনেম যেমন pcode)।

এটি কোডকে কেন স্লো ও বিপজ্জনক করছে?
0 (Zero) ফ্যালসি বাগ (Falsy Trap): জাভাস্ক্রিপ্টে 0 || 5 সবসময় 5 রিটার্ন করে! যদি কোনো প্রোডাক্টের ডিসকাউন্ট বা স্টক 0 হয়, item.discount || item.discountAmount ভুল করে পরের ফিল্ডের মান তুলে নিয়ে আসে। (এখানে অন্তত ?? বা নালিলাইজেশন দরকার ছিল)।
টেবিল ও ফিল্টারিং-এ CPU-এর ওপর চাপ: একটি টেবিলে যদি ১০০টি রো থাকে এবং সার্চ বক্সে ব্যবহারকারী টাইপ করেন, প্রতিটি কি-স্ট্রোকে শত শত অবজেক্টের ওপর ২০টি করে || এবং toLowerCase() চলতে থাকে। এতে প্রতি সেকেন্ডে হাজার হাজার অস্থায়ী স্ট্রিং অবজেক্ট তৈরি হয় যা ব্রাউজারের মেমোরিতে গার্বেজ বাড়ায় এবং স্ক্রিন হালকা ল্যাগ করে।
টাইপস্ক্রিপ্টের সেফটি নষ্ট (any টাইপের ছড়াছড়ি): কোন ফিল্ডে কী ডেটা আছে তা নিশ্চিত না থাকায় কোডের সর্বত্র (item as any) বা (p as any) লিখতে হয়েছে। এর ফলে টাইপস্ক্রিপ্টের কোনো সুরক্ষাই কার্যকর থাকে না।
সিনিয়র ডেভেলপার স্ট্যান্ডার্ড সমাধান (Adapter / DTO Pattern):

প্রতিটি পেজে বা টেবিলের ভেতরে ১০০ বার || || না লিখে, API থেকে রেসপন্স আসার মুখেই (Query Layer) একটি Adapter ফাংশন দিয়ে ডেটাকে ক্লিন সিঙ্গেল অবজেক্টে কনভার্ট করে ফেলা:

typescript
// একবার ক্লিন করে নিলে আর কখনোই || || লিখতে হয় না
export const normalizeProduct = (raw: any): CleanProduct => ({
  id: String(raw.id ?? raw.productId ?? ""),
  code: raw.productCode ?? raw.pcode ?? raw.code ?? "",
  name: raw.productName ?? raw.name ?? "Unknown",
  purchasePrice: Number(raw.purchasePrice ?? raw.rate ?? 0),
  stock: Number(raw.stock ?? raw.quantity ?? 0),
});

এর পর টেবিল, ফর্ম বা সার্চ কোথাও আর একটিও || লাগবে না—সরাসরি product.code, product.name ব্যবহার হবে এবং টাইপস্ক্রিপ্ট ১০০% অটোকমপ্লিট দেবে।

৪. একটি ফর্মে ৩০টি useState এবং Re-render Lag
PurchaseForm এবং SaleForm-এ প্রায় ২৫ থেকে ৩০টি লোকাল useState রয়েছে।
ব্যবহারকারী যখনই একটি সংখ্যা টাইপ করেন (যেমন ডিসকাউন্ট বা ক্যাশ অ্যামাউন্ট), পুরো ২৬০০ লাইনের মেগা-কম্পোনেন্ট এবং তার ভেতরের সমস্ত সাব-কম্পোনেন্ট ও মোডাল পুনরায় এক্সিকিউট (Re-render) হয়।
সমাধান: পেমেন্ট সেকশন, প্রোডাক্ট টেবিল সেকশন এবং মোডালগুলোকে ছোট ছোট মেমোইজড কম্পোনেন্টে ভাগ করা।