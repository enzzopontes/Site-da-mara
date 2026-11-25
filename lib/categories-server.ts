import { unstable_cache } from "next/cache"
import { fetchCategoriesFromDb, type Category } from "@/lib/categories-db"

export const CATEGORIES_CACHE_TAG = "categories"

export const getCachedActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return fetchCategoriesFromDb({ includeInactive: false })
  },
  ["active-categories-v1"],
  {
    tags: [CATEGORIES_CACHE_TAG],
    revalidate: 60,
  }
)
