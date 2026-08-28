import { z } from "zod";
import {
  publicProcedure,
  router,
  protectedProcedure,
} from "#root/shared/trpc/server";
import { getHomepageContent } from "./get-homepage-content";
import { updateHomepageContent } from "./update-homepage-content";
import { uploadHeroImage } from "./upload-hero-image";
import { ValuePropIconType, type HomepageContent } from "#root/shared/types/homepage-content";
import { Effect } from "effect";

// Zod schema for validating homepage content
const HomepageContentSchema = z.object({
  meta: z.object({
    enabled: z.boolean(),
    pageTitle: z.string(),
    pageDescription: z.string(),
  }),
  hero: z.object({
    enabled: z.boolean(),
    title: z.string(),
    subtitle: z.string(),
    ctaText: z.string(),
    ctaLink: z.string(),
    backgroundImage: z.string().nullish(),
    mobileBackgroundImage: z.string().nullish(),
    heroSlides: z
      .array(
        z.object({
          id: z.string(),
          imageUrl: z.string(),
          mobileImageUrl: z.string().nullish(),
          linkUrl: z.string().nullish(),
          alt: z.string().nullish(),
        }),
      )
      .nullish(),
    // Optional hero overline + secondary CTA (Noir). Declared explicitly so
    // z.object's default key-stripping does not drop them on updateContent.
    eyebrow: z.string().nullish(),
    secondaryCtaText: z.string().nullish(),
    secondaryCtaLink: z.string().nullish(),
  }),
  brandStatement: z.object({
    enabled: z.boolean(),
    title: z.string(),
    description: z.string(),
    image: z.string().nullish(),
    eyebrow: z.string().nullish(),
    benefits: z
      .array(
        z.object({
          icon: z.nativeEnum(ValuePropIconType),
          title: z.string(),
          description: z.string(),
        }),
      )
      .nullish(),
  }),
  promoBanner: z.object({
    enabled: z.boolean(),
    text: z.string(),
    linkText: z.string().nullish(),
    linkUrl: z.string().nullish(),
  }),
  categories: z.object({
    enabled: z.boolean(),
    title: z.string(),
    titleAr: z.string().nullish(),
    subtitle: z.string(),
    ctaText: z.string(),
    ctaLink: z.string(),
  }),
  featuredProducts: z.object({
    enabled: z.boolean(),
    title: z.string(),
    titleAr: z.string().nullish(),
    subtitle: z.string(),
    viewAllText: z.string(),
    viewAllTextAr: z.string().nullish(),
    viewAllLink: z.string(),
    productIds: z.array(z.string().uuid()).nullish(),
  }),
  valueProps: z.object({
    enabled: z.boolean(),
    items: z.array(
      z.object({
        icon: z.nativeEnum(ValuePropIconType),
        title: z.string(),
        description: z.string(),
      }),
    ),
  }),
  newsletter: z.object({
    enabled: z.boolean(),
    title: z.string(),
    subtitle: z.string(),
    placeholderText: z.string(),
    ctaText: z.string(),
    privacyText: z.string(),
  }),
  footerCta: z.object({
    enabled: z.boolean(),
    title: z.string(),
    subtitle: z.string(),
    ctaText: z.string(),
    ctaLink: z.string(),
  }),
  discountedProducts: z
    .object({
      enabled: z.boolean(),
      title: z.string(),
      titleAr: z.string().nullish(),
      viewAllText: z.string(),
      viewAllTextAr: z.string().nullish(),
      viewAllLink: z.string(),
      productIds: z.array(z.string().uuid()).nullish(),
    })
    .nullish(),
  newArrivals: z
    .object({
      enabled: z.boolean(),
      title: z.string(),
      titleAr: z.string().nullish(),
      viewAllText: z.string(),
      viewAllTextAr: z.string().nullish(),
      viewAllLink: z.string(),
      productIds: z.array(z.string().uuid()).nullish(),
    })
    .nullish(),
  marquee: z
    .object({
      enabled: z.boolean(),
      text: z.string(),
      textAr: z.string().nullish(),
    })
    .nullish(),
  promoLine: z
    .object({
      text: z.string(),
      textAr: z.string().nullish(),
    })
    .nullish(),
  contactBanner: z
    .object({
      enabled: z.boolean(),
      slides: z.array(
        z.object({
          id: z.string(),
          imageUrl: z.string(),
          mobileImageUrl: z.string().nullish(),
          alt: z.string().nullish(),
        }),
      ),
      heading: z.string(),
      headingAr: z.string().nullish(),
      description: z.string(),
      descriptionAr: z.string().nullish(),
      directionsUrl: z.string().nullish(),
    })
    .nullish(),
  bottomCarousel: z
    .object({
      enabled: z.boolean(),
      slides: z.array(
        z.object({
          id: z.string(),
          imageUrl: z.string(),
          mobileImageUrl: z.string().nullish(),
          linkUrl: z.string().nullish(),
          alt: z.string().nullish(),
        }),
      ),
    })
    .nullish(),
  aboutUs: z
    .object({
      enabled: z.boolean(),
      title: z.string(),
      titleAr: z.string().nullish(),
      description: z.string(),
      descriptionAr: z.string().nullish(),
      imageUrl: z.string().nullish(),
    })
    .nullish(),
  returnPolicy: z
    .object({
      enabled: z.boolean(),
      title: z.string(),
      titleAr: z.string().nullish(),
      intro: z.string(),
      introAr: z.string().nullish(),
      steps: z.array(
        z.object({
          icon: z.nativeEnum(ValuePropIconType),
          title: z.string(),
          titleAr: z.string().nullish(),
          description: z.string(),
          descriptionAr: z.string().nullish(),
        }),
      ),
      detailSections: z.array(
        z.object({
          title: z.string(),
          titleAr: z.string().nullish(),
          body: z.string(),
          bodyAr: z.string().nullish(),
        }),
      ),
      footerPrefix: z.string(),
      footerPrefixAr: z.string().nullish(),
      supportEmail: z.string(),
      footerMiddle: z.string(),
      footerMiddleAr: z.string().nullish(),
      contactLinkLabel: z.string(),
      contactLinkLabelAr: z.string().nullish(),
      contactLinkUrl: z.string(),
    })
    .nullish(),
  // FAQ page content (Noir /faq). Declared explicitly so z.object's key
  // stripping does not drop it on updateContent.
  faq: z
    .object({
      enabled: z.boolean(),
      eyebrow: z.string(),
      eyebrowAr: z.string().nullish(),
      title: z.string(),
      titleAr: z.string().nullish(),
      subtitle: z.string(),
      subtitleAr: z.string().nullish(),
      items: z.array(
        z.object({
          id: z.string(),
          question: z.string(),
          questionAr: z.string().nullish(),
          answer: z.string(),
          answerAr: z.string().nullish(),
          order: z.number().int().nullish(),
        }),
      ),
    })
    .nullish(),
  productCarouselTitle: z.string().nullish(),
  productCarouselTitleAr: z.string().nullish(),
  testimonials: z.object({
    enabled: z.boolean(),
    title: z.string().nullish(),
    titleAr: z.string().nullish(),
    // Declared explicitly so z.object's key-stripping does not drop them on
    // updateContent — same guard as the hero's eyebrow/secondary CTA.
    subtitle: z.string().nullish(),
    subtitleAr: z.string().nullish(),
    ratingOverride: z.number().min(0).max(5).nullish(),
    reviewCountOverride: z.number().int().min(0).nullish(),
    ctaText: z.string().nullish(),
    ctaLink: z.string().nullish(),
    items: z.array(z.object({
      name: z.string(),
      nameAr: z.string().nullish(),
      rating: z.number().min(1).max(5),
      review: z.string(),
      reviewAr: z.string().nullish(),
      // Declared so z.object's key-stripping preserves them on updateContent.
      mediaUrl: z.string().nullish(),
      mediaType: z.enum(["image", "video"]).nullish(),
      productLabel: z.string().nullish(),
      productLabelAr: z.string().nullish(),
      verified: z.boolean().nullish(),
    })),
  }).nullish(),
});

export const homepageRouter = router({
  getContent: publicProcedure
    .input(
      z.object({
        merchantId: z.string().uuid(),
        templateId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const content = await getHomepageContent(
        input.merchantId,
        input.templateId,
      );
      return {
        success: true,
        result: content,
      };
    }),

  updateContent: protectedProcedure
    .input(
      z.object({
        merchantId: z.string().uuid(),
        templateId: z.string().optional(),
        content: HomepageContentSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const content = await updateHomepageContent(
        input.merchantId,
        input.content as HomepageContent,
        input.templateId,
      );
      return {
        success: true,
        result: content,
      };
    }),

  uploadHeroImage: protectedProcedure
    .input(
      z.object({
        file: z.object({
          name: z.string(),
          type: z.string(),
          buffer: z.instanceof(Uint8Array),
        }),
        preserveAspect: z.boolean().nullish(), // For brand statement images
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.clientSession;

      // Only admins can upload homepage hero images
      if (!session || session.role !== "admin") {
        return {
          success: false as const,
          error: "Unauthorized. Only admins can upload homepage images.",
        };
      }

      try {
        const result = await Effect.runPromise(
          uploadHeroImage({
            buffer: input.file.buffer,
            mimeType: input.file.type,
            preserveAspect: input.preserveAspect ?? undefined,
          }),
        );

        return {
          success: true as const,
          data: result,
        };
      } catch (error) {
        console.error("Homepage hero image upload error:", error);
        return {
          success: false as const,
          error:
            error instanceof Error ? error.message : "Failed to upload image",
        };
      }
    }),

  uploadMobileHeroImage: protectedProcedure
    .input(
      z.object({
        file: z.object({
          name: z.string(),
          type: z.string(),
          buffer: z.instanceof(Uint8Array),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.clientSession;

      // Only admins can upload homepage hero images
      if (!session || session.role !== "admin") {
        return {
          success: false as const,
          error: "Unauthorized. Only admins can upload homepage images.",
        };
      }

      try {
        const result = await Effect.runPromise(
          uploadHeroImage({
            buffer: input.file.buffer,
            mimeType: input.file.type,
            filenamePrefix: "hero-mobile",
          }),
        );

        return {
          success: true as const,
          data: result,
        };
      } catch (error) {
        console.error("Mobile hero image upload error:", error);
        return {
          success: false as const,
          error:
            error instanceof Error ? error.message : "Failed to upload image",
        };
      }
    }),
});
