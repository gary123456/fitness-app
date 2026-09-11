import { supabase } from "@/lib/supabase";

export interface MacroTarget {
  protein: number;
  carbs: number;
  fats: number;
}

export async function calculateRecipePortions(recipeId: string, target: MacroTarget) {
  // 1. Récupération de la recette et de la composition des aliments
  const { data: recipeData, error } = await supabase
    .from('nutrition_recipes')
    .select(`
      *,
      recipe_ingredients (
        is_protein_anchor, is_carb_anchor, is_fat_anchor, is_free_food, fixed_amount_g,
        nutrition_ingredients (*)
      )
    `)
    .eq('id', recipeId)
    .single();

  if (error || !recipeData) throw new Error("Recette introuvable.");

  const ingredients = recipeData.recipe_ingredients;
  let computedIngredients = [];
  let totalKcal = 0;
  let totalProt = 0;
  let totalCarb = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const item of ingredients) {
    const ing = item.nutrition_ingredients;
    let computedGrams = 0;

    // Calcul de l'ancre Protéine
    if (item.is_protein_anchor) {
      computedGrams = (target.protein / ing.prot_per_100g) * 100;
    } 
    // Calcul de l'ancre Glucides
    else if (item.is_carb_anchor) {
      computedGrams = (target.carbs / ing.carb_per_100g) * 100;
    } 
    // Calcul de l'ancre Lipides
    else if (item.is_fat_anchor) {
      computedGrams = (target.fats / ing.fat_per_100g) * 100;
    } 
    // Aliments de volume et de fibres (Légumes) calculés proportionnellement
    else if (item.is_free_food) {
      // Si la cible calorique du repas est haute (ex: gros dîner), on scale les légumes
      computedGrams = Math.round(target.carbs * 2.5); 
      if (computedGrams < 100) computedGrams = 100; // Minimum 100g de fibres
    }
    // Si l'ingrédient a un grammage fixe (Épices, Sauces)
    else if (item.fixed_amount_g) {
      computedGrams = item.fixed_amount_g;
    }

    computedGrams = Math.round(computedGrams);
    if (computedGrams <= 0 && !item.is_free_food) computedGrams = 10;

    const r = computedGrams / 100;
    totalProt += ing.prot_per_100g * r;
    totalCarb += ing.carb_per_100g * r;
    totalFat += ing.fat_per_100g * r;
    totalFiber += (ing.fiber_per_100g || 0) * r;
    totalKcal += ing.kcal_per_100g * r;

    computedIngredients.push({
      name_fr: ing.name_fr,
      name_en: ing.name_en,
      grams: computedGrams
    });
  }

  return {
    recipe: recipeData,
    ingredients: computedIngredients,
    macros: {
      kcal: Math.round(totalKcal),
      protein: Math.round(totalProt),
      carbs: Math.round(totalCarb),
      fats: Math.round(totalFat),
      fiber: Math.round(totalFiber)
    }
  };
}