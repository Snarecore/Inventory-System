import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { showErrorToast } from '@/utils/toast-utils'

export type AppearanceLanguage = 'bn' | 'en'

const LANGUAGE_STORAGE_KEY = 'cash-boi-appearance-language'

const BANGLA: Record<string, string> = {
  Appearance: 'অ্যাপের চেহারা ও প্রদর্শন',
  'Controls the look of every form, button and table in the application. Settings apply instantly and are saved to this browser only — they do not affect other users.':
    'এখান থেকে পুরো অ্যাপের ফর্ম, বাটন, টেবিল ও অন্যান্য অংশের চেহারা বদলাতে পারবেন। পরিবর্তন সঙ্গে সঙ্গেই দেখা যাবে এবং শুধু এই ব্রাউজারেই সেভ থাকবে।',
  'Reduce motion': 'অ্যানিমেশন কমান',
  'Reset to theme defaults': 'থিমের আগের সেটিংসে ফিরুন',
  'Restore defaults': 'সব ডিফল্টে ফিরুন',
  Theme: 'থিম বাছাই',
  'Each theme sets its own palette, shape and density. Pick one as a starting point, then adjust anything below.':
    'প্রতিটি থিমে রং, কোণা, ফিল্ডের মাপ ও ঘনত্ব আলাদা। পছন্দের একটি থিম বেছে নিয়ে নিচের সেটিংস নিজের মতো করে নিন।',
  'Theme studio': 'নিজের থিম বানান',
  'Density & typography': 'ফিল্ডের মাপ ও লেখার ধরন',
  'Control height drives every input, select and button at once.':
    'এখান থেকে ইনপুট, ড্রপডাউন ও বাটনের উচ্চতা একসঙ্গে ঠিক করুন।',
  'Control height': 'ফিল্ড ও বাটনের উচ্চতা',
  'Base font size': 'লেখার সাইজ',
  'Font family': 'লেখার ফন্ট',
  'Field & label style': 'ফিল্ড ও লেবেলের ধরন',
  'How every input is drawn and where its label sits. Inline labels fall back to stacked on phone-width screens.':
    'ফিল্ড দেখতে কেমন হবে, লেবেল কোথায় থাকবে ঠিক করুন। ছোট স্ক্রিনে পাশাপাশি লেবেল নিজে থেকেই ওপরে চলে যাবে।',
  'Field style': 'ফিল্ড দেখতে কেমন হবে?',
  'Label placement': 'লেবেল কোথায় থাকবে?',
  'Label case': 'লেবেলের অক্ষর',
  'Required indicator': 'অবশ্যই দিতে হবে—এটা কীভাবে দেখাব?',
  'Focus indicator': 'ফিল্ডে ক্লিক করলে কীভাবে বোঝাবে?',
  'Primary button style': 'বাটন দেখতে কেমন হবে?',
  'Validation feedback': 'ভুল হলে কীভাবে দেখাবে?',
  'Choose how invalid fields and their messages appear.':
    'তথ্য ভুল বা ফাঁকা থাকলে ফিল্ড ও বার্তা কীভাবে দেখাবে, বেছে নিন।',
  'Shape & borders': 'কোণা, বর্ডার ও ছায়া',
  'Tune corner radius, border weight and elevation independently of the theme.':
    'থিমের রং না বদলিয়েও বক্সের কোণা, বর্ডারের পুরুত্ব ও ছায়া আলাদা করে ঠিক করুন।',
  'Corner radius': 'বক্সের কোণা কতটা গোল হবে?',
  'Border weight': 'বর্ডার কতটা মোটা হবে?',
  Elevation: 'ছায়া কেমন হবে?',
  'Accent colour': 'মূল রং',
  'Overrides the theme accent. Hover, light and dark shades are derived automatically.':
    'থিমের মূল রং বদলান। মাউস নিলে, হালকা ও গাঢ় রং নিজে থেকেই তৈরি হবে।',
  'Table & layout': 'টেবিল ও পেজের মাপ',
  'Row height and content width for data screens, separate from form density.':
    'টেবিলের সারির উচ্চতা এবং পেজে কনটেন্টের জায়গা ঠিক করুন। ফর্মের মাপ এর থেকে আলাদা।',
  'Page content width': 'পেজে কনটেন্ট কতটা চওড়া হবে?',
  'Table row height': 'টেবিলের সারি কতটা উঁচু হবে?',
  'Table row appearance': 'টেবিলের সারি দেখতে কেমন হবে?',
  Dialogs: 'ডায়ালগ ও পপ-আপ',
  'Adjust the shared modal and confirmation dialog treatment.':
    'পপ-আপ ও নিশ্চিত করার ডায়ালগের চেহারা বেছে নিন।',
  'Dialog appearance': 'ডায়ালগ দেখতে কেমন হবে?',
  'Alerts & notifications': 'নোটিশ ও মেসেজ',
  'Choose how success, error, and loading notifications are presented.':
    'কাজ সফল, ভুল বা লোড হওয়ার মেসেজ কীভাবে দেখাবে, বেছে নিন।',
  'Notification appearance': 'নোটিশ দেখতে কেমন হবে?',
  'Saved configurations': 'সেভ করা সেটিংস',
  'Live preview': 'সঙ্গে সঙ্গে দেখে নিন',
  'Real components': 'অ্যাপের নমুনা',
  'Current configuration': 'এখনকার সেটিংস',
  'setting overridden from the': 'টি সেটিংস বদলানো হয়েছে —',
  'setting overrides from the': 'টি সেটিংস বদলানো হয়েছে —',
  Density: 'ফিল্ডের মাপ',
  Font: 'ফন্ট',
  'Font size': 'লেখার সাইজ',
  Radius: 'কোণা',
  Border: 'বর্ডার',
  'Table rows': 'টেবিলের সারি',
  Labels: 'লেবেল',
  Focus: 'ফোকাস',
  Buttons: 'বাটন',
  Validation: 'ভুল দেখানোর ধরন',
  'Content width': 'পেজের চওড়াই',
  Alerts: 'নোটিশ',
  'From theme': 'থিম অনুযায়ী',
  Compact: 'ছোট ও গুছানো',
  Default: 'মাঝারি',
  Comfortable: 'বড় ও আরামদায়ক',
  Small: 'ছোট',
  Medium: 'মাঝারি',
  Large: 'বড়',
  'Extra large': 'আরও বড়',
  '1200px — focused workspace': '১২০০ পিক্সেল — গুছানো কাজের জায়গা',
  '1440px — more room for content': '১৪৪০ পিক্সেল — আরও বেশি জায়গা',
  'Use all available space': 'পুরো জায়গা ব্যবহার হবে',
  Standard: 'সাধারণ',
  'Full width': 'পুরো চওড়া',
  'Plain rows': 'সাধারণ সারি',
  'Clean background with hover state': 'পরিষ্কার ব্যাকগ্রাউন্ড, মাউস নিলে হাইলাইট হবে',
  'Striped rows': 'এক সারি পরপর আলাদা রং',
  'Alternating backgrounds for scanning': 'সারি আলাদা করে সহজে পড়া যাবে',
  'Outlined': 'বর্ডারসহ',
  'Border on all sides, white fill': 'চারদিকে বর্ডার, ভেতরে সাদা',
  'Filled': 'রংভরা',
  'Tinted fill, border only on focus': 'হালকা রং, ক্লিক করলে বর্ডার দেখা যাবে',
  'Underlined': 'নিচে দাগ',
  'Bottom rule only, no box': 'বক্স নয়, শুধু নিচে দাগ',
  'Tinted fill with a visible border': 'হালকা রং ও দেখা যায় এমন বর্ডার',
  'Above field': 'ফিল্ডের ওপরে',
  'Stacked — best for narrow columns': 'একটার নিচে একটা — সরু জায়গায় সুবিধা',
  'Beside field': 'ফিল্ডের পাশে',
  'Inline — denser, classic ERP': 'একই লাইনে — কম জায়গায় বেশি তথ্য',
  'Sentence case': 'স্বাভাবিক লেখা',
  'Invoice amount': 'ইনভয়েসের পরিমাণ',
  Uppercase: 'বড় হাতের অক্ষর',
  'INVOICE AMOUNT': 'ইনভয়েসের পরিমাণ',
  Asterisk: 'তারকা চিহ্ন (*)',
  'Amount *': 'পরিমাণ *',
  'Text': 'লেখা দিয়ে',
  'Amount (required)': 'পরিমাণ (অবশ্যই দিতে হবে)',
  Hidden: 'দেখাবে না',
  'No indicator': 'কোনো চিহ্ন থাকবে না',
  Ring: 'চারদিকে গোল দাগ',
  '3px halo around the field': 'ফিল্ডের চারপাশে দাগ',
  'Thick border': 'মোটা বর্ডার',
  'Border weight increases': 'ক্লিক করলে বর্ডার মোটা হবে',
  Underline: 'নিচে দাগ',
  'Accent bar along the bottom': 'নিচে রঙিন দাগ',
  Glow: 'আলোর আভা',
  'Wider, softer halo': 'চারপাশে নরম আভা',
  Solid: 'গাঢ় রং',
  'Filled accent background': 'মূল রং দিয়ে ভরা',
  'Soft': 'হালকা রং',
  'Tinted background, accent text': 'হালকা রং, মূল রঙের লেখা',
  'Outline': 'শুধু বর্ডার',
  'Accent border, transparent fill': 'মূল রঙের বর্ডার, ভেতরে রং নেই',
  'Red outline + message': 'লাল বর্ডার ও নিচে বার্তা',
  'Clear border with text below': 'লাল বর্ডার, নিচে ভুলের কারণ',
  'Soft highlight': 'হালকা লাল রং',
  'Tinted red field with text below': 'ফিল্ডে হালকা লাল রং, নিচে বার্তা',
  'Message callout': 'বক্সে ভুলের বার্তা',
  'Outlined field and boxed message': 'লাল বর্ডার ও আলাদা বার্তার বক্স',
  Flat: 'ছায়া ছাড়া',
  'No shadow': 'কোনো ছায়া থাকবে না',
  Subtle: 'হালকা ছায়া',
  'Light lift on cards': 'কার্ডে হালকা ছায়া',
  Raised: 'গাঢ় ছায়া',
  'Pronounced depth': 'স্পষ্ট গভীরতার ছায়া',
  Hairline: 'পাতলা',
  '1px': '১ পিক্সেল',
  '1.5px': '১.৫ পিক্সেল',
  '2px': '২ পিক্সেল',
  '36px rows': '৩৬ পিক্সেল সারি',
  '44px rows': '৪৪ পিক্সেল সারি',
  '52px rows': '৫২ পিক্সেল সারি',
  '4px': '৪ পিক্সেল',
  '6px': '৬ পিক্সেল',
  '8px': '৮ পিক্সেল',
  '12px': '১২ পিক্সেল',
  '14px': '১৪ পিক্সেল',
  '0px': '০ পিক্সেল',
  '32px controls — most rows per screen': '৩২ পিক্সেল — এক স্ক্রিনে বেশি সারি',
  '38px controls — balanced': '৩৮ পিক্সেল — মাঝারি মাপ',
  '44px controls — easiest to hit': '৪৪ পিক্সেল — চাপতে সুবিধা',
  '13px base': '১৩ পিক্সেল',
  '14px base': '১৪ পিক্সেল',
  '15px base': '১৫ পিক্সেল',
  '16px base': '১৬ পিক্সেল',
  'Accent on surface': 'ব্যাকগ্রাউন্ডে মূল রং',
  'Text on surface': 'ব্যাকগ্রাউন্ডে লেখা',
  'Button text on accent': 'বাটনের রঙের ওপর লেখা',
  'Accent text on white': 'সাদা ব্যাকগ্রাউন্ডে মূল রং',
  'Use theme accent': 'থিমের রং ব্যবহার করুন',
  'Brand colours': 'ব্র্যান্ডের রং',
  Other: 'অন্যান্য রং',
  Use: 'ব্যবহার করুন',
  'Hex value': 'রঙের কোড',
  'Enter a 6-digit hex colour, e.g. #01306B': '৬ সংখ্যার রঙের কোড লিখুন, যেমন #01306B',
  'Bengali sample': 'বাংলা লেখার নমুনা',
  System: 'কম্পিউটারের ফন্ট',
  Google: 'গুগল ফন্ট',
  CDN: 'অনলাইন ফন্ট',
  'ERP, HRMS, tables, forms': 'অফিসের হিসাব, কর্মী তথ্য, টেবিল ও ফর্ম',
  'General business applications': 'সাধারণ অফিসের কাজ',
  'Microsoft-style applications': 'মাইক্রোসফটের মতো চেহারা',
  'Compact business interfaces': 'কম জায়গায় বেশি তথ্য',
  'Native operating-system appearance': 'কম্পিউটারের নিজস্ব চেহারা',
  'Modern web applications': 'আধুনিক ওয়েব অ্যাপ',
  'Admin dashboards': 'অ্যাডমিন ড্যাশবোর্ড',
  'Business portals': 'ব্যবসার পোর্টাল',
  'Corporate websites': 'প্রতিষ্ঠানের ওয়েবসাইট',
  'Enterprise applications': 'বড় প্রতিষ্ঠানের অ্যাপ',
  'Reports and forms': 'রিপোর্ট ও ফর্ম',
  'Modern dashboards': 'আধুনিক ড্যাশবোর্ড',
  'Landing pages and headings': 'ওয়েবসাইটের শুরু ও শিরোনাম',
  'Multilingual applications': 'একাধিক ভাষার অ্যাপ',
  'Current Cash Boi default': 'ক্যাশ বইয়ের বর্তমান ডিফল্ট',
  'Bengali UI text': 'বাংলা অ্যাপের লেখা',
  'Bengali websites': 'বাংলা ওয়েবসাইট',
  'Bengali business applications': 'বাংলা অফিসের অ্যাপ',
  'Formal documents': 'আনুষ্ঠানিক কাগজপত্র',
  'Print-style reports': 'প্রিন্ট করার রিপোর্ট',
  'Ships with Windows; falls back elsewhere': 'উইন্ডোজে থাকে; অন্য কম্পিউটারে বিকল্প ফন্ট দেখাবে',
  'Geometric and wide — heavy for dense tables': 'গোলাকার ও চওড়া — ঘন টেবিলে বেশি জায়গা নেয়',
  'Covers Bengali and Latin in one face': 'বাংলা ও ইংরেজি দুই লেখাই দেখা যায়',
  'Community CDN, not Google — self-host for production': 'কমিউনিটি সার্ভার থেকে আসে; লাইভ ব্যবহারে নিজস্ব সার্ভারে রাখা ভালো',
  'Search fonts': 'ফন্ট খুঁজুন',
  'No font matches': 'এই নামে কোনো ফন্ট পাওয়া যায়নি',
  Form: 'ফর্ম',
  Table: 'টেবিল',
  Dialog: 'ডায়ালগ',
  'Customer name': 'কাস্টমারের নাম',
  'Payment method': 'পেমেন্টের মাধ্যম',
  Cash: 'নগদ',
  'Bank transfer': 'ব্যাংক ট্রান্সফার',
  'Mobile banking': 'মোবাইল ব্যাংকিং',
  'Reference (read-only)': 'রেফারেন্স (বদলানো যাবে না)',
  Discount: 'ছাড়',
  'Discount cannot be negative': 'ছাড়ের পরিমাণ শূন্যের কম হতে পারবে না',
  Note: 'নোট',
  'Shown on the printed invoice.': 'প্রিন্ট করা ইনভয়েসে দেখা যাবে।',
  Invoice: 'ইনভয়েস',
  Customer: 'কাস্টমার',
  Status: 'অবস্থা',
  Amount: 'পরিমাণ',
  Paid: 'পরিশোধ',
  Due: 'বাকি',
  Partial: 'আংশিক',
  Variants: 'বাটনের ধরন',
  'Save invoice': 'ইনভয়েস সেভ করুন',
  Cancel: 'বাতিল',
  Duplicate: 'কপি করুন',
  Delete: 'মুছুন',
  More: 'আরও',
  Disabled: 'চালু নেই',
  'Selection controls': 'নির্বাচনের অপশন',
  'Mark as paid': 'পরিশোধ হয়েছে চিহ্নিত করুন',
  Credit: 'বাকি',
  'Delete invoice?': 'ইনভয়েসটি মুছবেন?',
  'will be removed and the customer ledger adjusted. This cannot be undone.':
    'মুছে যাবে এবং কাস্টমারের হিসাবও বদলে যাবে। মুছে ফেললে আর ফেরত আনা যাবে না।',
  'The theme has been applied.': 'থিমটি চালু হয়েছে।',
  'Imported theme': 'ইমপোর্ট করা থিম',
  Fail: 'পাস হয়নি',
  'AA Large': 'AA বড় লেখা',
  AA: 'AA',
  AAA: 'AAA',
  'Built-in': 'অ্যাপের সঙ্গে থাকা থিম',
  'Your themes': 'আপনার বানানো থিম',
  Active: 'চালু আছে',
  Edit: 'এডিট',
  'No custom themes yet.': 'এখনও নিজের কোনো থিম বানানো হয়নি।',
  'New theme': 'নতুন থিম',
  Import: 'ইমপোর্ট',
  'Export all': 'সব এক্সপোর্ট করুন',
  'Export': 'এক্সপোর্ট',
  'Theme name': 'থিমের নাম',
  Description: 'বর্ণনা',
  'Where this theme suits best': 'কোন কাজে এই থিম ভালো হবে',
  'Extract colours from pasted text': 'লেখা থেকে রং বের করুন',
  'Extract palette': 'রং বের করুন',
  'Or pick the colours out of a logo': 'অথবা লোগো থেকে রং নিন',
  'Choose logo image': 'লোগো বাছাই করুন',
  'Dominant colours by area': 'লোগোতে বেশি থাকা রং',
  Palette: 'রঙের তালিকা',
  'Save theme': 'থিম সেভ করুন',
  'Contrast check': 'লেখা পড়া যাচ্ছে কি না দেখুন',
  'Use a theme you own': 'আপনার পছন্দের কোনো থিম ব্যবহার করুন',
  'Current setup': 'এখনকার সেটআপ',
  'Store the current setup under a name, or move it to another browser as a file. Saved here, not on the server.':
    'এখনকার সেটিংস একটি নামে সেভ করুন, অথবা ফাইল হিসেবে অন্য ব্রাউজারে নিয়ে যান। সেটিংস এই ব্রাউজারেই থাকবে, সার্ভারে নয়।',
  'Preset name': 'সেটিংসের নাম',
  'e.g. Accounts desk — compact': 'যেমন: হিসাব ডেস্ক — ছোট মাপ',
  'Save current': 'এখনকার সেটিংস সেভ',
  Apply: 'চালু করুন',
  'Import file': 'ফাইল ইমপোর্ট',
  'Web sans-serif': 'ওয়েবের সাধারণ ফন্ট',
  'Bengali / বাংলা': 'বাংলা ফন্ট',
  Serif: 'সেরিফ ফন্ট',
  Monospace: 'সমান-চওড়া ফন্ট',
  Accent: 'মূল রং',
  'Accent (hover)': 'মাউস নিলে মূল রং',
  'Accent (light fill)': 'মূল রঙের হালকা ছোঁয়া',
  'Accent (dark)': 'মূল রঙের গাঢ় ছোঁয়া',
  'Accent (muted)': 'মূল রঙের নরম ছোঁয়া',
  'Secondary accent': 'সহায়ক রং',
  Surface: 'পেজের ব্যাকগ্রাউন্ড',
  'Surface (muted)': 'হালকা ব্যাকগ্রাউন্ড',
  'Surface (sunken)': 'আরও গাঢ় ব্যাকগ্রাউন্ড',
  'Border (strong)': 'মোটা বর্ডার',
  'Text (muted)': 'হালকা লেখা',
  'Text (subtle)': 'আরও হালকা লেখা',
  'Search by name or use — e.g. tables, Bengali, reports': 'ফন্টের নাম বা কাজ লিখে খুঁজুন—যেমন টেবিল, বাংলা, রিপোর্ট',
  'Delete the theme': 'থিমটি মুছবেন',
  'This cannot be undone.': 'মুছে ফেললে আর ফেরত আনা যাবে না।',
  'Search': 'খুঁজুন',
  'My theme': 'আমার থিম',
  'Saved here, not on the server.': 'এখানেই সেভ হবে, সার্ভারে নয়।',
  'Build your own theme, or paste the colours from a theme you own to convert it. Only colour values are read — no CSS or assets are copied.':
    'নিজের থিম বানান, অথবা পছন্দের থিমের রঙের কোড পেস্ট করে আনুন। শুধু রং নেওয়া হবে—কোনো CSS বা ফাইল কপি হবে না।',
  'Reads the dominant colours straight from the image in your browser. Nothing is uploaded.':
    'ছবির প্রধান রং এই ব্রাউজারেই দেখা হবে। ছবি কোথাও আপলোড হবে না।',
  'Default shape & density for this theme': 'এই থিমের ডিফল্ট কোণা ও ফিল্ডের মাপ',
  'Save & apply': 'সেভ করে চালু করুন',
  'standard': 'সাধারণ',
  'wide': 'চওড়া',
  'full': 'পুরো চওড়া',
  'none': 'চৌকো',
  'sm': 'অল্প গোল',
  'md': 'মাঝারি গোল',
  'lg': 'বেশি গোল',
  'xl': 'আরও বেশি গোল',
  'hairline': 'পাতলা',
  'standard border': 'মাঝারি',
  'strong': 'মোটা',
  'compact': 'ছোট ও গুছানো',
  'default': 'মাঝারি',
  'comfortable': 'বড় ও আরামদায়ক',
  'outlined': 'বর্ডারসহ',
  'filled': 'রংভরা',
  'underlined': 'নিচে দাগ',
  'soft': 'হালকা রং',
  'top': 'ফিল্ডের ওপরে',
  'left': 'ফিল্ডের পাশে',
  'normal': 'স্বাভাবিক লেখা',
  'upper': 'বড় হাতের অক্ষর',
  'asterisk': 'তারকা চিহ্ন (*)',
  'text': 'লেখা দিয়ে',
  'ring': 'চারদিকে গোল দাগ',
  'border': 'মোটা বর্ডার',
  'underline': 'নিচে দাগ',
  'glow': 'আলোর আভা',
  'solid': 'গাঢ় রং',
  'outline': 'শুধু বর্ডার',
  'callout': 'বক্সে ভুলের বার্তা',
  'plain': 'সাধারণ সারি',
  'striped': 'এক সারি পরপর আলাদা রং',
  'accent': 'ব্র্যান্ডের রং',
  'The Cash Boi default. Deep navy accent, soft borders, balanced density.':
    'ক্যাশ বইয়ের ডিফল্ট চেহারা—গাঢ় নীল, হালকা বর্ডার ও মাঝারি মাপ।',
  'Catalina Blue leading, Cerulean as the secondary, Mystic surfaces.':
    'ক্যাটালিনা ব্লু মূল রং, সিরুলিয়ান সহায়ক রং এবং হালকা ব্যাকগ্রাউন্ড।',
  'Cerulean leading with Curious Blue on hover, Catalina Blue as the secondary.':
    'সিরুলিয়ান মূল রং, মাউস নিলে কিউরিয়াস ব্লু এবং ক্যাটালিনা ব্লু সহায়ক রং।',
  'Flat, low-chrome and tight. Built for dense data entry over long sessions.':
    'সাদামাটা ও কম জায়গার নকশা—অনেক তথ্য একসঙ্গে দেখার জন্য।',
  'Warm red accent on a soft neutral base, generous spacing and rounded controls.':
    'হালকা ব্যাকগ্রাউন্ডে উষ্ণ লাল রং, বেশি ফাঁকা জায়গা ও গোলাকার ফিল্ড।',
  'Cool teal accent with crisp edges. Reads well next to charts and figures.':
    'শীতল টিল রং ও স্পষ্ট বর্ডার—চার্ট ও হিসাবের পাশে মানানসই।',
  'Near-black accent and heavy 2px borders. Maximum legibility and AAA text contrast.':
    'কালচে মূল রং ও মোটা বর্ডার—লেখা স্পষ্ট দেখার জন্য।',
  'Filled fields on a cool grey base. Soft, modern and easy on long data entry.':
    'ধূসর ব্যাকগ্রাউন্ডে রংভরা ফিল্ড—দীর্ঘসময় তথ্য লেখার জন্য আরামদায়ক।',
  'Accounting-oriented green with tight rows. Positive figures read naturally.':
    'হিসাবের জন্য সবুজ রং ও ছোট সারি—ইতিবাচক অঙ্ক সহজে চোখে পড়ে।',
  'Underlined fields and no boxes. Minimal chrome, maximum content.':
    'বক্স ছাড়া নিচে দাগ দেওয়া ফিল্ড—কম সাজসজ্জায় বেশি তথ্য।',
  'Warm paper-toned surfaces with an amber accent. Low glare for all-day use.':
    'কাগজের মতো উষ্ণ ব্যাকগ্রাউন্ড ও অ্যাম্বার রং—চোখে কম ঝলক লাগে।',
}

interface AppearanceLanguageContextValue {
  language: AppearanceLanguage
  setLanguage: (language: AppearanceLanguage) => void
  t: (text: string) => string
}

const AppearanceLanguageContext = createContext<AppearanceLanguageContextValue | null>(null)

export const AppearanceLanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<AppearanceLanguage>(() => {
    if (typeof window === 'undefined') return 'bn'
    try {
      return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'bn'
    } catch {
      return 'bn'
    }
  })

  const setLanguage = (next: AppearanceLanguage) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      showErrorToast(
        next === 'bn'
          ? 'এই ব্রাউজারে ভাষার পছন্দ সেভ করা যায়নি।'
          : 'Language preference could not be saved in this browser.'
      )
    }
  }

  const value = useMemo<AppearanceLanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (text) => (language === 'bn' ? BANGLA[text] ?? text : text),
    }),
    [language]
  )

  return (
    <AppearanceLanguageContext.Provider value={value}>
      {children}
    </AppearanceLanguageContext.Provider>
  )
}

export const useAppearanceLanguage = () => {
  const context = useContext(AppearanceLanguageContext)
  if (!context) {
    throw new Error('useAppearanceLanguage must be used within AppearanceLanguageProvider')
  }
  return context
}

export const useAppearanceTranslation = () => useAppearanceLanguage().t
