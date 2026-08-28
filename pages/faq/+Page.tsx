import { useData } from "vike-react/useData";
import { useTemplate } from "#root/frontend/contexts/TemplateContext";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { NoirPageFrame } from "#root/components/template-system/noir/NoirPageFrame";
import { NoirFaqSection } from "#root/components/template-system/noir/NoirFaqSection";
import type { Data } from "./+data";

export { Page };

/**
 * /faq — CMS-driven FAQ page.
 *
 * Owned by Demo 5 "Noir": it renders the Noir framed shell, so it is gated to
 * the Noir landing template exactly the way /about-us and /return-policy are
 * gated to Minimal. The other four demos keep their own FAQ treatments (the
 * V1 templates render `components/globals/FAQ` inline on the homepage) and
 * are untouched by this route.
 *
 * All copy comes from `homepageContent.faq`, edited in
 * Dashboard → Homepage Content → FAQ Page.
 */
function Page() {
  const { homepageContent, activeTemplateId } = useData<Data>();
  const { getTemplateId } = useTemplate();
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";

  // Client-side lookup honours `?templatePreview=`; the SSR value from +data
  // is the fallback so the first paint is already correct.
  const landingTemplateId = getTemplateId("landing") ?? activeTemplateId;
  const isNoir = landingTemplateId === "landing-noir";

  if (!isNoir) {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <p className='text-gray-500'>Page not found</p>
      </div>
    );
  }

  const faq = homepageContent.faq;

  if (!faq?.enabled || faq.items.length === 0) {
    return (
      <NoirPageFrame
        announcementText={
          homepageContent.promoBanner.enabled
            ? homepageContent.promoBanner.text
            : undefined
        }>
        <div className='flex min-h-[40vh] items-center justify-center px-6 py-24'>
          <p className='text-[#A3A3A3]'>
            {isAr
              ? "هذه الصفحة غير متاحة حالياً"
              : "This page is not available yet"}
          </p>
        </div>
      </NoirPageFrame>
    );
  }

  return (
    <NoirPageFrame
      announcementText={
        homepageContent.promoBanner.enabled
          ? homepageContent.promoBanner.text
          : undefined
      }>
      {/* This page is about the FAQ, so its title is the document's h1.
          The landing embeds the same section as an h2 under its hero. */}
      <NoirFaqSection faq={faq} headingLevel='h1' />
    </NoirPageFrame>
  );
}
