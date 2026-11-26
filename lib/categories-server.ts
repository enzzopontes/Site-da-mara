import { unstable_cache } from "next/cache"
import { fetchCategoriesFromDb, type Category } from "@/lib/categories-db"
import { fetchHomeGridLayoutFromDb, type HomeGridLayout } from "@/lib/home-grid-layout"

export const CATEGORIES_CACHE_TAG = "categories"
export const HOME_GRID_LAYOUT_CACHE_TAG = "home-grid-layout"

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

export const getCachedHomeGridLayout = unstable_cache(
  async (): Promise<HomeGridLayout> => {
    return fetchHomeGridLayoutFromDb()
  },
  ["home-grid-layout-v1"],
  {
    tags: [CATEGORIES_CACHE_TAG, HOME_GRID_LAYOUT_CACHE_TAG],
    revalidate: 60,
  }
)
