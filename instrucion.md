হ্যাঁ, কিছু সমস্যা আছে। List page-টা ([index.tsx](src/pages/admin/trade/purchase-return/index.tsx)) মোটামুটি ঠিক আছে, বড় সমস্যাগুলো **Create Return form** ([PurchaseReturnForm.tsx](src/pages/admin/trade/purchase-return/components/PurchaseReturnForm.tsx), ২১৭৫ লাইন)-এ। Infinite loop বা নিজে নিজে বারবার চলা কোনো effect পাইনি। নিচে গুরুত্ব অনুযায়ী সাজালাম:

**🔴 গুরুতর (আগে ঠিক করা উচিত)**

1. **Save fail হলেও success দেখায়** ([PurchaseReturnForm.tsx:1019-1091](src/pages/admin/trade/purchase-return/components/PurchaseReturnForm.tsx#L1019-L1091))
   - `postData` error হলে throw করে না, `{ error: true }` ফেরত দেয়, কিন্তু form সেটা check করে না।
   - ফলে server-এ save না হলেও "created successfully" দেখায়, নিজে একটা return number বানিয়ে নেয়, আর list page-এ চলে যায়।
   - User ভাববে return হয়ে গেছে, আসলে হয়নি।

2. **Invoice search ধীর, data বাড়লে system slow হবে** ([PurchaseReturnForm.tsx:551-572](src/pages/admin/trade/purchase-return/components/PurchaseReturnForm.tsx#L551-L572))
   - Search box-এ প্রতিটা অক্ষর টাইপ করলে প্রতিটা purchase-এর জন্য সব return record আবার loop হয় (nested loop), সাথে প্রতিবার regex চলে।
   - ২০০০ purchase থাকলে প্রতি keystroke-এ কয়েক মিলিয়ন কাজ, তাই টাইপ করার সময় আটকে যাবে।
   - সমাধান: data load হলে একবার হিসাব করে রাখা, তারপর search-এ শুধু সেখান থেকে খুঁজে নেওয়া।

3. **ভুল purchase-কে "already returned" ধরে** ([PurchaseReturnForm.tsx:328-332](src/pages/admin/trade/purchase-return/components/PurchaseReturnForm.tsx#L328-L332))
   - Invoice number substring দিয়ে মেলায়, তাই PUR-10 return হলে PUR-1-ও "returned" দেখায়।
   - কোনো return record-এ invoice বা challan খালি থাকলে সেটা সব purchase-এর সাথে মিলে যায়, কারণ `"abc".includes("")` সবসময় `true`।
   - Return-এর `id`-কে purchase-এর `id`-র সাথে মেলায়।
   - ফলে ঠিকঠাক purchase-ও dropdown থেকে বাদ পড়ে বা return block হয়ে যায়।

**🟡 একই API একাধিকবার call হয়**

4. **একই data আলাদা আলাদা cache-এ রাখা**
   - `get-purchase-and-return-list` তিনটা আলাদা key-তে cache হয়: list page, Purchase List page, আর form। তাই এই তিন screen-এর মধ্যে ঘুরলে একই API ৩ বার call হয়।
   - `get-purchase-list`-ও purchase return-এর ভেতরে ২টা আলাদা key-তে আছে।
   - [PurchaseReturnPurchasesPage.tsx](src/pages/admin/trade/purchase-return/PurchaseReturnPurchasesPage.tsx)-এ `refetchOnMount: "always"` থাকায় cache থাকলেও প্রতিবার page খুললেই দুটো API আবার call হয়।
   - Form-এ list খালি এলে পরপর দ্বিতীয় আরেকটা API call করে।

5. **Print-এর জন্য প্রতিবার internet থেকে Tailwind load হয়** ([PurchaseReturnInvoiceModal.tsx:62](src/pages/admin/trade/purchase-return/components/PurchaseReturnInvoiceModal.tsx#L62))
   - প্রতিবার print করলে internet থেকে বড় একটা Tailwind script নামায়।
   - Internet না থাকলে print-এ কোনো design আসবে না।
   - Sales return-এও একই সমস্যা।

**🟢 অপ্রয়োজনীয় code (speed-এ প্রভাব নেই, কিন্তু maintain করা কঠিন)**

6. Form-এ `postData`-কে `try/catch` দিয়ে মোড়ানো আছে, অথচ `postData` কখনো throw করে না, তাই catch কখনো চলে না। এছাড়া প্রতিটা field-এর জন্য ৭-১০টা fallback key, ২৭টা `useState`, আর কিছু lint warning আছে (unused `setStatus`, render-এর সময় ref পড়া, effect-এর dependency missing)।
7. Purchase List page আর list page-এর "Purchase List" tab-এ একই filter/sort logic দুইবার লেখা, প্রায় ৩০০ লাইন। Sales-এও এই একই structure আছে।
8. আমার লেখা [index.tsx:222](src/pages/admin/trade/purchase-return/index.tsx#L222)-এ "returned" set-এ return-এর `id` রাখছি, sales-এর মতো করেই। API যদি return-এর আলাদা id পাঠায়, তাহলে একই নম্বরের purchase ভুল করে "returned" দেখাতে পারে।

আমার পরামর্শ: আগে ১, ২, ৩ ঠিক করা, কারণ এগুলো ভুল data আর slow হওয়ার আসল কারণ। তারপর ৪ ঠিক করলে বাড়তি API call কমে যাবে। কোনগুলো ঠিক করব বলো, করে দিচ্ছি।