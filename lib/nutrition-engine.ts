import { supabase } from "@/lib/supabase";

export interface MacroTarget {
  protein: number;
  carbs: number;
  fats: number;
}

export async function calculateRecipePortions(recipeId: string, target: MacroTarget) {
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
  
  // 🛡️ SÉCURITÉ : Si la matrice de liaison est vide
  if (!ingredients || ingredients.length === 0) {
    throw new Error("⚠️ Matrice vide : Cette recette n'a pas encore ses ingrédients assignés dans la base de données.");
  }

  let computedIngredients = [];
  let totalKcal = 0;
  let totalProt = 0;
  let totalCarb = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const item of ingredients) {
    const ing = item.nutrition_ingredients;
    if (!ing) continue;

    // Forcer la conversion en nombre (Supabase renvoie parfois des Strings pour les NUMERIC)
    const prot_100g = parseFloat(ing.prot_per_100g) || 0;
    const carb_100g = parseFloat(ing.carb_per_100g) || 0;
    const fat_100g = parseFloat(ing.fat_per_100g) || 0;
    const fiber_100g = parseFloat(ing.fiber_per_100g) || 0;
    const kcal_100g = parseFloat(ing.kcal_per_100g) || 0;

    let computedGrams = 0;

    if (item.is_protein_anchor && prot_100g > 0) {
      computedGrams = (target.protein / prot_100g) * 100;
    } else if (item.is_carb_anchor && carb_100g > 0) {
      computedGrams = (target.carbs / carb_100g) * 100;
    } else if (item.is_fat_anchor && fat_100g > 0) {
      computedGrams = (target.fats / fat_100g) * 100;
    } else if (item.is_free_food) {
      computedGrams = Math.round(target.carbs * 2.5); 
      if (computedGrams < 100) computedGrams = 100; 
    } else if (item.fixed_amount_g) {
      computedGrams = parseFloat(item.fixed_amount_g);
    }

    computedGrams = Math.round(computedGrams);
    if (computedGrams <= 0 && !item.is_free_food) computedGrams = 10;

    const r = computedGrams / 100;
    totalProt += prot_100g * r;
    totalCarb += carb_100g * r;
    totalFat += fat_100g * r;
    totalFiber += fiber_100g * r;
    totalKcal += kcal_100g * r;

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