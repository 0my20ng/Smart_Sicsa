export interface RecommendRequest {
  query?: string;
  ingredients?: string[];
}

export interface RecipeItem {
  title: string;
  ingredients: string[];
  missingIngredients: string[];
  description: string;
  link?: string;
  imageUrl?: string;
}

export interface RecipeListResponse {
  recipes: RecipeItem[];
  count: number;
  recommendedMenus?: string[];
}

export interface ErrorResponse {
  detail: string;
}
