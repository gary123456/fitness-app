"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Dumbbell, Utensils, Activity } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

// CORRECTION TYPESCRIPT : Déclaration stricte du format
interface ExtraSport { id: string; label: string; }

const EXTRA_SPORTS: ExtraSport[] = [
  { id: "jjb", label: "JJB / Lutte / MMA" }, { id: "football", label: "Football / Rugby" },
  { id: "basketball", label: "Basketball / Volley" }, { id: "running", label: "Running / Sprint" },
  { id: "natation", label: "Natation" }, { id: "cyclisme", label: "Cyclisme / Vélo" },
  { id: "randonnee", label: "Randonnée / Marche" }, { id: "padel_tennis", label: "Padel / Tennis" }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const { lang } = useLanguage();

  const t = {
    FR: { title: "Bilan Initial Athlète", sub: "L'algorithme va cartographier votre fatigue globale pour concevoir votre programme sur-mesure.", fname: "Prénom", lname: "Nom", dob: "Date de naissance", height: "Taille (cm)", weight: "Poids (kg)", gender: "Sexe (Biologique)", male: "Homme", female: "Femme", sports: "Planning des Sports Complémentaires", sportsSub: "Indiquez vos entraînements externes pour éviter le sur-entraînement.", goal: "Objectif Principal", freq: "Séances de Musculation / sem", exp: "Niveau en musculation", equip: "Matériel accessible", diet: "Contraintes alimentaires", activity: "Activité quotidienne", med: "Antécédents / Blessures", submit: "Générer mon programme", day: "Jour", month: "Mois", year: "Année" },
    EN: { title: "Initial Athlete Assessment", sub: "The algorithm will map your global fatigue to design your custom program.", fname: "First Name", lname: "Last Name", dob: "Date of Birth", height: "Height (cm)", weight: "Weight (kg)", gender: "Gender (Biological)", male: "Male", female: "Female", sports: "Complementary Sports Schedule", sportsSub: "Indicate external training to avoid overtraining.", goal: "Main Goal", freq: "Lifting Sessions / week", exp: "Lifting Experience", equip: "Available Equipment", diet: "Dietary Restrictions", activity: "Daily Activity", med: "Medical Conditions / Injuries", submit: "Generate my program", day: "Day", month: "Month", year: "Year" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", birthDay: "", birthMonth: "", birthYear: "", height: "", weight: "", gender: "", activityLevel: "", goal: "", medicalConditions: "Aucune", alcohol: "", smoker: "", drugs: "", sleep: "", diet: "aucune", experience: "", frequency: "", equipment: [] as string[],
    weeklySchedule: { monday: [] as string[], tuesday: [] as string[], wednesday: [] as string[], thursday: [] as string[], friday: [] as string[], saturday: [] as string[], sunday: [] as string[] }
  });

  useEffect(() => {
    const savedData = localStorage.getItem("onboarding_form_backup");
    if (savedData) try { setFormData(JSON.parse(savedData)); } catch (e) {}
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login"); else { setUserId(user.id); setUserEmail(user.email || ""); }
      setMounted(true);
    };
    getUser();
  }, [router]);

  useEffect(() => { if (mounted) localStorage.setItem("onboarding_form_backup", JSON.stringify(formData)); }, [formData, mounted]);

  if (!mounted) return null;

  const handleEquipmentChange = (id: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, equipment: checked ? [...prev.equipment, id] : prev.equipment.filter(e => e !== id) }));
  };

  const handleSportToggle = (day: string, sportId: string, checked: boolean) => {
    setFormData(prev => {
      const dayKey = day as keyof typeof prev.weeklySchedule;
      const daySports = prev.weeklySchedule[dayKey] || [];
      return { ...prev, weeklySchedule: { ...prev.weeklySchedule, [dayKey]: checked ? [...daySports, sportId] : daySports.filter(s => s !== sportId) } };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg("");
    try {
      const birthDateStr = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;
      const { error: profileError } = await supabase.from("profiles").insert([{
        id: userId, email: userEmail, first_name: formData.firstName, last_name: formData.lastName, birth_date: birthDateStr, height_cm: parseFloat(formData.height), weight_kg: parseFloat(formData.weight), gender: formData.gender, activity_level: formData.activityLevel, current_goal: formData.goal, medical_conditions: formData.medicalConditions, alcohol_consumption: formData.alcohol, smoker: formData.smoker, recreational_drugs: formData.drugs, sleep_quality: formData.sleep, dietary_preferences: formData.diet, training_experience: formData.experience, training_frequency: formData.frequency, equipment_access: formData.equipment.join(", "), weekly_schedule: formData.weeklySchedule
      }]);
      if (profileError) throw profileError;
      await supabase.from("measurements").insert([{ user_id: userId, weight_kg: parseFloat(formData.weight) }]);
      localStorage.removeItem("onboarding_form_backup");
      window.location.href = "/dashboard";
    } catch (error: any) { setErrorMsg(error.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 md:p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-4xl shadow-2xl border-zinc-200 dark:border-zinc-800 my-8 bg-white dark:bg-zinc-900/80">
        <CardHeader className="space-y-3 text-center pb-8 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-4xl font-extrabold tracking-tight dark:text-zinc-50">{txt.title}</CardTitle>
          <CardDescription className="text-lg font-medium max-w-2xl mx-auto dark:text-zinc-400">{txt.sub}</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-10 pt-8">
            <div className="space-y-5 bg-zinc-50 dark:bg-zinc-950/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2"><Label>{txt.fname}</Label><Input required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="bg-white dark:bg-zinc-900" /></div>
                <div className="space-y-2"><Label>{txt.lname}</Label><Input required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="bg-white dark:bg-zinc-900" /></div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{txt.dob}</Label>
                  <div className="flex space-x-2">
                    <Select value={formData.birthDay} onValueChange={(v) => setFormData({...formData, birthDay: v})} required>
                      <SelectTrigger className="w-[90px] bg-white dark:bg-zinc-900"><SelectValue placeholder={txt.day} /></SelectTrigger>
                      <SelectContent>{Array.from({length: 31}, (_, i) => i + 1).map(d => (<SelectItem key={d} value={d.toString().padStart(2, '0')}>{d}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={formData.birthMonth} onValueChange={(v) => setFormData({...formData, birthMonth: v})} required>
                      <SelectTrigger className="flex-1 bg-white dark:bg-zinc-900"><SelectValue placeholder={txt.month} /></SelectTrigger>
                      <SelectContent>{Array.from({length: 12}, (_, i) => i + 1).map(m => (<SelectItem key={m} value={m.toString().padStart(2, '0')}>{m}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={formData.birthYear} onValueChange={(v) => setFormData({...formData, birthYear: v})} required>
                      <SelectTrigger className="w-[110px] bg-white dark:bg-zinc-900"><SelectValue placeholder={txt.year} /></SelectTrigger>
                      <SelectContent>{Array.from({length: 80}, (_, i) => new Date().getFullYear() - 14 - i).map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>{txt.height}</Label><Input type="number" required value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} className="bg-white dark:bg-zinc-900" /></div>
                <div className="space-y-2"><Label>{txt.weight}</Label><Input type="number" step="0.1" required value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="bg-white dark:bg-zinc-900" /></div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{txt.gender}</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})} required>
                    <SelectTrigger className="bg-white dark:bg-zinc-900"><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homme">{txt.male}</SelectItem>
                      <SelectItem value="femme">{txt.female}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-5 bg-zinc-50 dark:bg-zinc-950/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-3 text-zinc-900 dark:text-zinc-50 font-bold text-xl mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Activity className="text-purple-600 dark:text-purple-400" /></div>
                <h3>{txt.sports}</h3>
              </div>
              <div className="space-y-4 pt-2">
                {Object.keys(DAYS).map((dayKey) => (
                  <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-2">
                    <span className="font-bold w-28 text-zinc-800 dark:text-zinc-200">{DAYS[dayKey as keyof typeof DAYS]}</span>
                    <div className="flex flex-wrap gap-4">
                      {EXTRA_SPORTS.map((sport) => {
                        const isChecked = (formData.weeklySchedule[dayKey as keyof typeof formData.weeklySchedule] || []).includes(sport.id);
                        return (
                          <div key={sport.id} className="flex items-center space-x-2">
                            <Checkbox id={`${dayKey}-${sport.id}`} checked={isChecked} onCheckedChange={(c) => handleSportToggle(dayKey, sport.id, c as boolean)} />
                            <Label htmlFor={`${dayKey}-${sport.id}`} className="text-xs cursor-pointer">{sport.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 bg-zinc-50 dark:bg-zinc-950/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>{txt.goal}</Label>
                  <Select value={formData.goal} onValueChange={(v) => setFormData({...formData, goal: v})} required>
                    <SelectTrigger className="bg-white dark:bg-zinc-900"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perte_poids">Perte de masse grasse / Fat loss</SelectItem>
                      <SelectItem value="recomposition">Recomposition corporelle / Recomp</SelectItem>
                      <SelectItem value="performance">Performance & Explosivité / Power</SelectItem>
                      <SelectItem value="prise_masse">Prise de masse musculaire / Bulking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{txt.freq}</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})} required>
                    <SelectTrigger className="bg-white dark:bg-zinc-900"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2_jours">2 / {lang === 'FR' ? "semaine" : "week"}</SelectItem>
                      <SelectItem value="3_jours">3 / {lang === 'FR' ? "semaine" : "week"}</SelectItem>
                      <SelectItem value="4_jours">4 / {lang === 'FR' ? "semaine" : "week"}</SelectItem>
                      <SelectItem value="5_plus">5+ / {lang === 'FR' ? "semaine" : "week"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{txt.exp}</Label>
                  <Select value={formData.experience} onValueChange={(v) => setFormData({...formData, experience: v})} required>
                    <SelectTrigger className="bg-white dark:bg-zinc-900"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debutant">0-1 an</SelectItem>
                      <SelectItem value="intermediaire">1-3 ans</SelectItem>
                      <SelectItem value="avance">+3 ans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3 md:col-span-2">
                  <Label>{txt.equip}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
                    <div className="flex items-center space-x-3"><Checkbox id="salle" checked={formData.equipment.includes("salle")} onCheckedChange={(c) => handleEquipmentChange("salle", c as boolean)} /><Label htmlFor="salle" className="text-sm cursor-pointer">Salle complète / Full Gym</Label></div>
                    <div className="flex items-center space-x-3"><Checkbox id="home_gym" checked={formData.equipment.includes("home_gym")} onCheckedChange={(c) => handleEquipmentChange("home_gym", c as boolean)} /><Label htmlFor="home_gym" className="text-sm cursor-pointer">Home Gym</Label></div>
                    <div className="flex items-center space-x-3"><Checkbox id="poids_corps" checked={formData.equipment.includes("poids_corps")} onCheckedChange={(c) => handleEquipmentChange("poids_corps", c as boolean)} /><Label htmlFor="poids_corps" className="text-sm cursor-pointer">Poids du corps / Bodyweight</Label></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 bg-zinc-50 dark:bg-zinc-950/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{txt.diet}</Label>
                  <Select value={formData.diet} onValueChange={(v) => setFormData({...formData, diet: v})} required>
                    <SelectTrigger className="bg-white dark:bg-zinc-900"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aucune">Omnivore</SelectItem>
                      <SelectItem value="vegetarien">Végétarien / Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="halal_casher">Halal / Casher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{txt.activity}</Label>
                  <Select value={formData.activityLevel} onValueChange={(v) => setFormData({...formData, activityLevel: v})} required>
                    <SelectTrigger className="bg-white dark:bg-zinc-900"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentaire">Sédentaire / Sedentary</SelectItem>
                      <SelectItem value="actif">Actif / Active</SelectItem>
                      <SelectItem value="tres_actif">Très actif / Very Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>{txt.med}</Label><Input required value={formData.medicalConditions} onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})} className="bg-white dark:bg-zinc-900" /></div>
              </div>
            </div>

            {errorMsg && <div className="p-4 rounded-lg text-sm font-bold text-center bg-red-50 text-red-600 border border-red-200">Erreur : {errorMsg}</div>}

          </CardContent>
          <CardFooter className="pt-6 pb-8 px-8">
            <Button type="submit" className="w-full text-xl h-16 font-extrabold shadow-lg bg-teal-500 hover:bg-teal-600 text-white" disabled={loading || !userId}>
              {loading ? "..." : txt.submit}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}