/**
 * Utility functions for consistent URL creation throughout the application
 */

/**
 * Creates a properly formatted URL for a product detail page
 */
export function getProductUrl(productId: string): string {
  return `/shop/${encodeURIComponent(productId)}`;
}

/**
 * Creates a properly formatted URL for a category page
 */
export function getCategoryUrl(categoryId: string): string {
  return `/featured/categories/${encodeURIComponent(categoryId)}`;
}
