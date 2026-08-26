import { formatCategoryName } from "#root/shared/utils/format";
import { query } from "#root/shared/database/drizzle/db";
import {
  category,
  file,
  product,
  productCategory,
  productImage,
  productVariant,
} from "#root/shared/database/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { ServerError } from "#root/shared/error/server";

// Schema for the input: just the product ID
export const getProductByIdSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
});

export const getProductById = (input: z.infer<typeof getProductByIdSchema>) =>
  Effect.gen(function* ($) {
    const result = yield* $(
      query(async (db) => {
        // Fetch the main product details
        const productResult = await db
          .select({
            product: product,
            primaryCategory: category,
            primaryImageFile: file,
          })
          .from(product)
          .innerJoin(category, eq(product.categoryId, category.id))
          .leftJoin(file, eq(product.imageId, file.id))
          .where(
            and(
              eq(product.id, input.productId),
              eq(product.deleted, false), // Exclude soft-deleted products
              eq(product.hidden, false), // Exclude hidden products
              eq(category.deleted, false), // Ensure primary category is not deleted
            ),
          )
          .limit(1);

        if (productResult.length === 0) {
          // No product found, or category criteria not met
          return null;
        }

        // Correctly access the nested properties
        const productData = productResult[0];
        if (!productData) return null;

        const {
          product: foundProduct,
          primaryCategory,
          primaryImageFile,
        } = productData;

        // Fetch all associated images for this product
        const images = await db
          .select({
            id: productImage.fileId,
            url: file.diskname,
            diskname: file.diskname,
            isPrimary: productImage.isPrimary,
          })
          .from(productImage)
          .innerJoin(file, eq(productImage.fileId, file.id))
          .where(eq(productImage.productId, foundProduct.id))
          .orderBy(productImage.sortOrder, productImage.isPrimary); // Order by sort then primary

        // Fetch all associated categories for this product
        const categories = await db
          .select({
            id: productCategory.categoryId,
            name: category.name,
            isPrimary: productCategory.isPrimary, // Include this if needed later
          })
          .from(productCategory)
          .innerJoin(category, eq(productCategory.categoryId, category.id))
          .where(
            and(
              eq(productCategory.productId, foundProduct.id),
              eq(category.deleted, false), // Ensure associated categories are not deleted
            ),
          );
        // No need to order here unless required

        // Fetch all variants for this product
        const variants = await db
          .select()
          .from(productVariant)
          .where(eq(productVariant.productId, foundProduct.id));

        // Format the final product object
        const formattedProduct = {
          ...foundProduct,
          price: Number(foundProduct.price),
          discountPrice: foundProduct.discountPrice
            ? Number(foundProduct.discountPrice)
            : null,
          imageUrl: primaryImageFile?.diskname || null,
          categoryName: formatCategoryName(primaryCategory.name),
          available: foundProduct.stock > 0,
          images: images.map((img) => ({
            id: img.id,
            url: img.diskname ? `/uploads/${img.diskname}` : "",
            diskname: img.diskname,
            isPrimary: img.isPrimary,
          })),
          imagesCombined:
            images.length > 0
              ? images.map((img) => ({
                  url: img.diskname ? `/uploads/${img.diskname}` : "",
                  isPrimary: img.isPrimary,
                }))
              : primaryImageFile?.diskname
                ? [
                    {
                      url: `/uploads/${primaryImageFile.diskname}`,
                      isPrimary: true,
                    },
                  ]
                : [],
          categories: categories.map((cat) => ({
            id: cat.id,
            name: formatCategoryName(cat.name),
          })),
          variants: variants.map((v) => ({
            name: v.name,
            values: (v.values as any[]).map((val) =>
              typeof val === "string" ? { value: val, priceModifier: 0 } : val,
            ),
          })),
          rating: 0,
          reviewCount: 0,
        };

        return formattedProduct;
      }),
    );
    // If result is null (product not found or criteria not met), Effect will handle it.
    // Consider adding specific error handling/tagging if needed.
    if (!result) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "NotFound",
            statusCode: 404,
            clientMessage: "Product not found or not available",
          }),
        ),
      );
    }
    return result;
  });

// Define the expected output type based on the successful result of the query function
// This assumes the structure returned by `formattedProduct` when successful
// Note: This might need manual adjustment if the structure changes significantly
export type ProductByIdResult = {
  id: string;
  name: string;
  description: string;
  imageId: string;
  categoryId: string;
  price: number;
  discountPrice: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  stock: number;
  imageUrl: string | null;
  categoryName: string;
  available: boolean;
  images: { id: string; url: string; diskname: string; isPrimary: boolean }[];
  imagesCombined: { url: string; isPrimary: boolean }[];
  categories: { id: string; name: string }[];
  variants: { name: string; values: string[] }[];
  rating: number;
  reviewCount: number;
};
