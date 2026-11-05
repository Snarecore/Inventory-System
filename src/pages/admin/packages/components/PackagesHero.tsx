import React from "react";
import { FaCrown, FaShieldAlt } from "react-icons/fa";

import type { UserSubscription } from "@/types";

interface PackagesHeroProps {
  subscription?: UserSubscription | null;
  currentPlanName?: string | null;
}

export const PackagesHero: React.FC<PackagesHeroProps> = ({ subscription, currentPlanName }) => {
  const effectivePlanName =
    currentPlanName ??
    (subscription?.packageName
      ? subscription.packageNameBn ?? subscription.packageName
      : subscription?.packageStatus && subscription.packageStatus !== "FREE"
      ? subscription.packageStatus
      : null);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-emerald-950 p-5 sm:p-7 text-white shadow-md border border-slate-800">
      {/* Decorative blurred background shapes */}
      <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-[11px] font-semibold tracking-wider uppercase mb-2 border border-white/10 backdrop-blur-xs">
            <FaCrown className="text-amber-400" size={11} />
            <span>CashBoi Packages • ক্যাশবই প্যাকেজ</span>
          </div>

          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight">
            যেভাবে আপনি টাকা পরিচালনা করেন, সেই অনুযায়ী সেরা প্ল্যান বেছে নিন
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            বিলিং সাইকেল পরিবর্তন করে সরাসরি প্যাকেজের মূল্য ও আকর্ষণীয় সাশ্রয় দেখুন। আপনার ব্যবসার পরিধি বাড়াতে যে কোনো সময় আপগ্রেড বা রিনিউ করুন।
          </p>
        </div>

        {effectivePlanName && (
          <div className="self-start md:self-auto shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FaShieldAlt size={14} />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 block uppercase font-medium">বর্তমান প্ল্যান</span>
              <span className="text-xs font-bold text-emerald-300">{effectivePlanName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackagesHero;
