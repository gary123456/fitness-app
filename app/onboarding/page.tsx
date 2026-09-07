"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Activity, ChevronRight, ChevronLeft, CheckCircle2, Zap } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

const EXTRA_SPORTS = [
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

  // 🚀 NOUVEAU : GESTION DES ÉTAPES
  const [step, setStep] = useState(0);

  const t = {
    FR: { welcome: "Bienvenue dans l'Écosystème", wSub: "Nous allons concevoir votre algorithme métabolique sur-mesure. Cela prend 2 minutes.", next: "Continuer", back: "Retour", finish: "Générer mon programme", day: "Jour", month: "Mois", year: "Année" },
    EN: { welcome: "Welcome to the Ecosystem", wSub: "We are going to design your custom metabolic algorithm. It takes 2 minutes.", next: "Continue", back: "Back", finish: "Generate Program", day: "Day", month: "Month", year: "Year" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", birthDay: "", birthMonth: "", birthYear: "", height: "", weight: "", gender: "", activityLevel: "", goal: "", medicalConditions: "Aucune", alcohol: "jamais", smoker: "non", drugs: "non", sleep: "moyen", diet: "aucune", experience: "", frequency: "", equipment: [] as string[],
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

  const validateStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.birthDay || !formData.height || !formData.weight || !formData.gender) {
        setErrorMsg("Veuillez remplir tous les champs obligatoires."); return false;
      }
    }
    if (step === 2) {
      if (!formData.activityLevel || !formData.experience || !formData.frequency) {
        setErrorMsg("Veuillez remplir tous les champs obligatoires."); return false;
      }
    }
    if (step === 3) {
      if (!formData.goal || formData.equipment.length === 0) {
        setErrorMsg("Veuillez choisir un objectif et au moins un équipement."); return false;
      }
    }
    setErrorMsg(""); return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => { setStep(s => s - 1); setErrorMsg(""); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true); setErrorMsg("");
    try {
      const birthDateStr = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;
      
      const { error: profileError } = await supabase.from("profiles").insert([{
        id: userId, email: userEmail, first_name: formData.firstName, last_name: formData.lastName, birth_date: birthDateStr, height_cm: parseFloat(formData.height), weight_kg: parseFloat(formData.weight), gender: formData.gender, activity_level: formData.activityLevel, current_goal: formData.goal, medical_conditions: formData.medicalConditions, alcohol_consumption: formData.alcohol, smoker: formData.smoker, recreational_drugs: formData.drugs, sleep_quality: formData.sleep, dietary_preferences: formData.diet, training_experience: formData.experience, training_frequency: formData.frequency, equipment_access: formData.equipment.join(", "), weekly_schedule: formData.weeklySchedule
      }]);
      if (profileError) throw profileError;
      
      await supabase.from("measurements").insert([{ user_id: userId, weight_kg: parseFloat(formData.weight) }]);
      localStorage.removeItem("onboarding_form_backup");
      
      router.push("/dashboard");
    } catch (error: any) { setErrorMsg(error.message); setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans relative overflow-hidden">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        
        {/* PROGRESS BAR */}
        <div className="mb-8 px-4">
          <div className="flex justify-between mb-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-zinc-800'}`}></div>
            ))}
          </div>
          <p className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest mt-4">Étape {step + 1} sur 4</p>
        </div>

        <Card className="shadow-2xl border-zinc-800 bg-zinc-900/60 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 sm:p-12 min-h-[400px]">
            
            {errorMsg && <div className="mb-6 p-4 rounded-xl text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20">{errorMsg}</div>}

            {/* ETAPE 0 : ACCUEIL */}
            {step === 0 && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-24 h-24 bg-teal-500/10 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.3)]">
                  <Zap className="w-12 h-12 text-teal-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white">{txt.welcome}</h1>
                <p className="text-zinc-400 font-medium text-lg max-w-md">{txt.wSub}</p>
              </div>
            )}

            {/* ETAPE 1 : BIOMÉTRIE */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-white">Identité & Biométrie</h2>
                  <p className="text-zinc-400">Les bases de votre moteur métabolique.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-zinc-300">Prénom</Label><Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="bg-zinc-950 border-zinc-800 text-white" /></div>
                  <div className="space-y-2"><Label className="text-zinc-300">Nom</Label><Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="bg-zinc-950 border-zinc-800 text-white" /></div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-zinc-300">Date de Naissance</Label>
                    <div className="flex space-x-2">
                      <Select value={formData.birthDay} onValueChange={(v) => setFormData({...formData, birthDay: v})}><SelectTrigger className="w-[100px] bg-zinc-950 border-zinc-800 text-white"><SelectValue placeholder="Jour" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{Array.from({length: 31}, (_, i) => i + 1).map(d => (<SelectItem key={d} value={d.toString().padStart(2, '0')}>{d}</SelectItem>))}</SelectContent></Select>
                      <Select value={formData.birthMonth} onValueChange={(v) => setFormData({...formData, birthMonth: v})}><SelectTrigger className="flex-1 bg-zinc-950 border-zinc-800 text-white"><SelectValue placeholder="Mois" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{Array.from({length: 12}, (_, i) => i + 1).map(m => (<SelectItem key={m} value={m.toString().padStart(2, '0')}>{m}</SelectItem>))}</SelectContent></Select>
                      <Select value={formData.birthYear} onValueChange={(v) => setFormData({...formData, birthYear: v})}><SelectTrigger className="w-[120px] bg-zinc-950 border-zinc-800 text-white"><SelectValue placeholder="Année" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{Array.from({length: 80}, (_, i) => new Date().getFullYear() - 14 - i).map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent></Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-zinc-300">Taille (cm)</Label><Input type="number" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} className="bg-zinc-950 border-zinc-800 text-white font-bold" /></div>
                  <div className="space-y-2"><Label className="text-zinc-300">Poids Actuel (kg)</Label><Input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="bg-zinc-950 border-zinc-800 text-white font-bold" /></div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-zinc-300">Sexe Biologique (Pour calcul hormonal)</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="femme">Femme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPE 2 : MODE DE VIE */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-white">Mode de Vie & Sports</h2>
                  <p className="text-zinc-400">Pour évaluer votre Dépense Énergétique (TDEE).</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Activité Quotidienne (Travail)</Label>
                    <Select value={formData.activityLevel} onValueChange={(v) => setFormData({...formData, activityLevel: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="sedentaire">Sédentaire (Bureau, Voiture)</SelectItem>
                        <SelectItem value="actif">Actif (Debout, Marche)</SelectItem>
                        <SelectItem value="tres_actif">Très actif (Travail physique)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Régime Alimentaire</Label>
                    <Select value={formData.diet} onValueChange={(v) => setFormData({...formData, diet: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="aucune">Omnivore (Classique)</SelectItem>
                        <SelectItem value="vegetarien">Végétarien</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="halal_casher">Halal / Casher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Expérience en Musculation</Label>
                    <Select value={formData.experience} onValueChange={(v) => setFormData({...formData, experience: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="debutant">Débutant (0 - 1 an)</SelectItem>
                        <SelectItem value="intermediaire">Intermédiaire (1 - 3 ans)</SelectItem>
                        <SelectItem value="avance">Avancé (+3 ans)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Disponibilité (Séances/Semaine)</Label>
                    <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="2_jours">2 jours</SelectItem>
                        <SelectItem value="3_jours">3 jours (Optimal)</SelectItem>
                        <SelectItem value="4_jours">4 jours</SelectItem>
                        <SelectItem value="5_plus">5 jours ou plus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3 sm:col-span-2 pt-4 border-t border-zinc-800">
                    <Label className="text-zinc-300 flex items-center text-base"><Activity className="w-5 h-5 mr-2 text-indigo-400"/> Autres sports pratiqués ? (Optionnel)</Label>
                    <p className="text-xs text-zinc-500">Pour que l'algorithme gère votre fatigue nerveuse.</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {Object.keys(DAYS).map((dayKey) => (
                        <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950 gap-2">
                          <span className="font-bold w-24 text-zinc-300 text-sm">{DAYS[dayKey as keyof typeof DAYS]}</span>
                          <div className="flex flex-wrap gap-2">
                            {EXTRA_SPORTS.map((sport) => {
                              const isChecked = (formData.weeklySchedule[dayKey as keyof typeof formData.weeklySchedule] || []).includes(sport.id);
                              return (
                                <div key={sport.id} className="flex items-center space-x-1 bg-zinc-900 px-2 py-1 rounded">
                                  <Checkbox id={`${dayKey}-${sport.id}`} checked={isChecked} onCheckedChange={(c) => handleSportToggle(dayKey, sport.id, c as boolean)} className="border-zinc-700 data-[state=checked]:bg-teal-500" />
                                  <Label htmlFor={`${dayKey}-${sport.id}`} className="text-[10px] cursor-pointer text-zinc-400">{sport.label}</Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPE 3 : OBJECTIF & MATERIEL */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-white">Objectif & Arsenal</h2>
                  <p className="text-zinc-400">La dernière étape avant la génération.</p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <Label className="text-zinc-300 text-base">Votre Objectif Ultime</Label>
                    <Select value={formData.goal} onValueChange={(v) => setFormData({...formData, goal: v})}>
                      <SelectTrigger className="h-14 text-lg font-bold bg-zinc-950 border-zinc-800 text-white"><SelectValue/></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="perte_poids">🔥 Perte de Masse Grasse (Déficit)</SelectItem>
                        <SelectItem value="recomposition">⚖️ Recomposition Corporelle (Maintien)</SelectItem>
                        <SelectItem value="performance">⚡ Performance & Force (Léger surplus)</SelectItem>
                        <SelectItem value="prise_masse">💪 Prise de Masse Musculaire (Surplus)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <Label className="text-zinc-300 text-base">Où allez-vous vous entraîner ?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.equipment.includes("salle") ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
                        <Checkbox className="sr-only" checked={formData.equipment.includes("salle")} onCheckedChange={(c) => handleEquipmentChange("salle", c as boolean)} />
                        <Dumbbell className={`w-8 h-8 mb-2 ${formData.equipment.includes("salle") ? 'text-teal-400' : 'text-zinc-500'}`} />
                        <span className="font-bold text-sm text-center text-zinc-300">Salle Complète</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.equipment.includes("home_gym") ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
                        <Checkbox className="sr-only" checked={formData.equipment.includes("home_gym")} onCheckedChange={(c) => handleEquipmentChange("home_gym", c as boolean)} />
                        <Dumbbell className={`w-8 h-8 mb-2 ${formData.equipment.includes("home_gym") ? 'text-teal-400' : 'text-zinc-500'}`} />
                        <span className="font-bold text-sm text-center text-zinc-300">Home Gym (Haltères)</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.equipment.includes("poids_corps") ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
                        <Checkbox className="sr-only" checked={formData.equipment.includes("poids_corps")} onCheckedChange={(c) => handleEquipmentChange("poids_corps", c as boolean)} />
                        <Activity className={`w-8 h-8 mb-2 ${formData.equipment.includes("poids_corps") ? 'text-teal-400' : 'text-zinc-500'}`} />
                        <span className="font-bold text-sm text-center text-zinc-300">Poids du Corps</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-zinc-800">
                    <Label className="text-zinc-500">Blessures ou contre-indications (Optionnel)</Label>
                    <Input value={formData.medicalConditions} onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-400" />
                  </div>
                </div>
              </div>
            )}

          </CardContent>

          {/* FOOTER : BOUTONS DE NAVIGATION */}
          <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center rounded-b-3xl">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={prevStep} className="text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold">
                <ChevronLeft className="w-5 h-5 mr-1" /> {txt.back}
              </Button>
            ) : <div></div>}

            {step < 3 ? (
              <Button type="button" onClick={nextStep} className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-black tracking-wide px-8 py-6 rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                {txt.next} <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="bg-teal-500 hover:bg-teal-400 text-zinc-950 font-black tracking-wide px-8 py-6 rounded-xl shadow-[0_0_30px_rgba(20,184,166,0.5)]">
                {loading ? "..." : <><CheckCircle2 className="w-5 h-5 mr-2" /> {txt.finish}</>}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}