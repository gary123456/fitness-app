"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
// 🛡️ CORRECTION : Imports Exhaustifs pour éviter tout crash
import { Settings, Save, AlertTriangle, Trash2, Brain, BellRing, Dumbbell, Calendar, User, ShieldCheck, Target, Medal, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { generateSmartWorkoutPlan } from "@/lib/workout-generator";

const EXTRA_SPORTS = [ 
  { id: "jjb", label: "JJB / MMA" }, { id: "football", label: "Football / Rugby" }, 
  { id: "basketball", label: "Basketball / Volley" }, { id: "running", label: "Running / Sprint" }, 
  { id: "natation", label: "Natation" }, { id: "cyclisme", label: "Cyclisme / Vélo" }, 
  { id: "randonnee", label: "Randonnée / Marche" }, { id: "padel_tennis", label: "Padel / Tennis" } 
];

const EQUIPMENTS = [
  { id: "poids_corps", label: "Poids du corps (Bodyweight)" },
  { id: "salle", label: "Salle de sport (Machines, Barres)" },
  { id: "home_gym", label: "Home Gym (Haltères, Kettlebells)" }
];

const AVATAR_LIST = [
  { id: "default", label: "Initial" },
  { id: "🧑", label: "Gars 1" }, { id: "👦🏽", label: "Gars 2" }, { id: "👨🏿‍🦲", label: "Gars 3" }, { id: "👱‍♂️", label: "Gars 4" }, { id: "🧔🏾‍♂️", label: "Gars 5" },
  { id: "👩", label: "Fille 1" }, { id: "👩🏽", label: "Fille 2" }, { id: "👩🏾‍🦱", label: "Fille 3" }, { id: "👱‍♀️", label: "Fille 4" }, { id: "👩🏿", label: "Fille 5" },
  { id: "🦊", label: "Renard" }, { id: "🐯", label: "Tigre" }, { id: "🐺", label: "Loup" }, { id: "🦍", label: "Gorille" }, 
  { id: "🐉", label: "Dragon" }, { id: "👽", label: "Alien" }, { id: "🤖", label: "Robot" }, { id: "👻", label: "Fantôme" }, { id: "🥷", label: "Ninja" }
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const fetchProfileData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: lastMeasurement } = await supabase
    .from("measurements")
    .select("weight_kg, body_fat_percentage")
    .eq("user_id", user.id)
    .not("weight_kg", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return { profile, currentWeight: lastMeasurement?.weight_kg || profile.weight_kg, currentBodyFat: lastMeasurement?.body_fat_percentage };
};

export default function SettingsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data, isLoading, mutate } = useSWR('settingsData', fetchProfileData);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editBodyFat, setEditBodyFat] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editSchedule, setEditSchedule] = useState<Record<string, string[]>>({});
  const [editEquipment, setEditEquipment] = useState<string[]>([]);
  const [editDisableQuiz, setEditDisableQuiz] = useState(false);
  const [editAvatar, setEditAvatar] = useState("default");
  
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [recalibrateAI, setRecalibrateAI] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const t = {
    FR: { title: "Paramètres", sub: "Configuration du moteur algorithmique.", save: "Enregistrer les modifications", recalc: "Recalibrer mon programme IA", danger: "Zone de Danger", deleteAcc: "Supprimer le compte", deleteWarn: "Tapez 'SUPPRIMER'", bfLabel: "Masse Grasse (%) - Optionnel", bfPlaceholder: "Ex: 15.5" },
    EN: { title: "Settings", sub: "Algorithmic engine configuration.", save: "Save changes", recalc: "Recalibrate AI program", danger: "Danger Zone", deleteAcc: "Delete Account", deleteWarn: "Type 'DELETE'", bfLabel: "Body Fat (%) - Optional", bfPlaceholder: "Ex: 15.5" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;
  const DAYS = lang === "FR" ? { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche" } : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

  useEffect(() => {
    if (data?.profile) {
      setEditFirstName(data.profile.first_name || "");
      setEditLastName(data.profile.last_name || "");
      setEditHeight(data.profile.height_cm?.toString() || "");
      setEditWeight(data.currentWeight?.toString() || data.profile.weight_kg?.toString() || "");
      setEditBodyFat(data.currentBodyFat ? data.currentBodyFat.toString() : "");
      setEditGoal(data.profile.current_goal);
      setEditExperience(data.profile.experience_level || "debutant");
      setEditSchedule(data.profile.weekly_schedule || { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });
      setEditEquipment(data.profile.equipment_access ? data.profile.equipment_access.split(',').map((e: string) => e.trim()) : ['poids_corps']);
      setEditDisableQuiz(data.profile.disable_quiz || false);
      setEditAvatar(data.profile.avatar_url || "default");
    }

    // 🛡️ SÉCURITÉ PWA : Éviter les erreurs côté serveur (SSR)
    if (typeof window !== "undefined" && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setIsPushEnabled(true);
          });
        }
      });
    }
  }, [data]);

  const handleSportToggle = (day: string, sportId: string, checked: boolean) => {
    setEditSchedule((prev) => {
      const daySports = prev[day] || [];
      return { ...prev, [day]: checked ? [...daySports, sportId] : daySports.filter((s) => s !== sportId) };
    });
  };

  const togglePushNotifications = async () => {
    if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        alert("Service Worker non installé. L'application doit être installée (PWA).");
        return;
      }

      if (isPushEnabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        }
        setIsPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        const subJson = subscription.toJSON();
        await supabase.from('push_subscriptions').insert([{
          user_id: data!.profile.id,
          endpoint: subJson.endpoint,
          auth_key: subJson.keys?.auth,
          p256dh_key: subJson.keys?.p256dh
        }]);

        setIsPushEnabled(true);
      }
    } catch (err: any) { console.error('Erreur Push', err); }
  };

  const handleUpdateProfile = async () => {
    if (!data?.profile) return;
    setActionLoading(true);
    try {
      const newWeight = parseFloat(editWeight);
      const newHeight = parseFloat(editHeight);
      const newBF = editBodyFat ? parseFloat(editBodyFat) : null;
      
      const updatedProfileData = { 
        first_name: editFirstName, last_name: editLastName, height_cm: newHeight, weight_kg: newWeight, 
        current_goal: editGoal, experience_level: editExperience, weekly_schedule: editSchedule,
        equipment_access: editEquipment.join(','), disable_quiz: editDisableQuiz, avatar_url: editAvatar
      };

      await supabase.from("profiles").update(updatedProfileData).eq("id", data.profile.id);
      
      if (newWeight !== data.currentWeight || newBF !== data.currentBodyFat) {
        await supabase.from("measurements").insert([{ user_id: data.profile.id, weight_kg: newWeight, body_fat_percentage: newBF }]);
      }

      if (recalibrateAI) {
         const { data: library } = await supabase.from("exercise_library").select("*");
         const { data: historyLogs } = await supabase.from("workout_logs").select("*").eq("user_id", data.profile.id);
         
         const completeProfileForAI = { ...data.profile, ...updatedProfileData };
         const newPlan = generateSmartWorkoutPlan(completeProfileForAI, library || [], historyLogs || [], false, []);
         
         await supabase.from("user_programs").update({ is_active: false }).eq("user_id", data.profile.id);

         const { data: newProgram } = await supabase.from("user_programs").insert([{ 
            user_id: data.profile.id, name: "Programme I.A. (Recalibré)", is_active: true, program_type: 'ai' 
         }]).select().single();

         if (newProgram) {
            let orderIndex = 0;
            for (const day of newPlan) {
              const { data: newSession } = await supabase.from("workout_sessions").insert([{ program_id: newProgram.id, day_name: day.day, order_index: orderIndex }]).select().single();
              if (newSession) {
                const exercisesToInsert = day.exercises.map((ex: any) => ({ session_id: newSession.id, exercise_id: ex.exercise.id, sets: ex.sets, target_reps: ex.target_reps, recommended_weight: ex.recommended_weight, rest_seconds: ex.rest_seconds, order_index: ex.order_index }));
                if (exercisesToInsert.length > 0) {
                  await supabase.from("workout_exercises").insert(exercisesToInsert);
                }
              }
              orderIndex++;
            }
         }
      }
      
      await mutate();
      setRecalibrateAI(false);
      alert(lang === 'FR' ? "Profil sauvegardé avec succès." : "Profile saved successfully.");
      router.push("/dashboard");
    } catch (error) { alert("Erreur de sauvegarde."); } finally { setActionLoading(false); }
  };

  const handleDeleteProfile = async () => {
    if (!data?.profile || (deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE")) return;
    setActionLoading(true);
    const userId = data.profile.id;
    try {
      const { data: files } = await supabase.storage.from('progress-photos').list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${file.name}`);
        await supabase.storage.from('progress-photos').remove(filePaths);
      }
      await supabase.rpc('delete_account');
    } catch (error) { console.error("Erreur lors de la purge :", error); }
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading || !data?.profile) return <div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto w-full pb-32">
      <div className="flex flex-col space-y-2 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
      </div>

      <div className="space-y-6">
        
        {/* IDENTITÉ & AVATAR */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center"><User className="w-5 h-5 mr-2 text-indigo-500"/> Identité & Avatar</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prénom</Label><Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="font-bold dark:bg-zinc-950 dark:border-zinc-800" /></div>
              <div className="space-y-2"><Label>Nom</Label><Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="font-bold dark:bg-zinc-950 dark:border-zinc-800" /></div>
            </div>
            <div className="space-y-2">
              <Label>Avatar de profil</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_LIST.map((av) => (
                  <button key={av.id} type="button" onClick={() => setEditAvatar(av.id)} className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${editAvatar === av.id ? 'ring-2 ring-teal-500 scale-110 bg-teal-50 dark:bg-teal-900/30' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-70 hover:opacity-100'}`} title={av.label}>
                    {av.id === 'default' ? <User className="w-6 h-6 text-zinc-500" /> : av.id}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BIOMÉTRIE & OBJECTIF */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center"><Target className="w-5 h-5 mr-2 text-orange-500"/> Biométrie & Objectif</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Poids (kg)</Label><Input type="number" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="font-bold dark:bg-zinc-950 dark:border-zinc-800" /></div>
              <div className="space-y-2"><Label className="text-teal-600 dark:text-teal-400">{txt.bfLabel}</Label><Input type="number" step="0.1" value={editBodyFat} onChange={(e) => setEditBodyFat(e.target.value)} placeholder={txt.bfPlaceholder} className="font-bold border-teal-500/30 focus-visible:ring-teal-500 dark:bg-zinc-950" /></div>
              <div className="space-y-2"><Label>Taille (cm)</Label><Input type="number" step="1" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="font-bold dark:bg-zinc-950 dark:border-zinc-800" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Objectif Actuel</Label>
                <Select value={editGoal} onValueChange={setEditGoal}>
                  <SelectTrigger className="font-bold dark:bg-zinc-950 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 font-bold">
                    <SelectItem value="perte_poids">Perte de masse grasse</SelectItem>
                    <SelectItem value="recomposition">Recomposition Corporelle</SelectItem>
                    <SelectItem value="performance">Performance & Force</SelectItem>
                    <SelectItem value="prise_masse">Prise de masse musculaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Niveau d'Expérience</Label>
                <Select value={editExperience} onValueChange={setEditExperience}>
                  <SelectTrigger className="font-bold dark:bg-zinc-950 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800 font-bold">
                    <SelectItem value="debutant">Débutant (0 - 1 an)</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire (1 - 3 ans)</SelectItem>
                    <SelectItem value="avance">Avancé (+3 ans)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ÉQUIPEMENT & SPORTS */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center"><Dumbbell className="w-5 h-5 mr-2 text-blue-500"/> Mode de vie & Entraînement</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-bold dark:text-zinc-300">Équipement disponible</Label>
              <div className="flex flex-col gap-2">
                {EQUIPMENTS.map(eq => (
                  <div key={eq.id} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Checkbox id={`eq-${eq.id}`} checked={editEquipment.includes(eq.id)} onCheckedChange={(c) => { if (typeof c === 'boolean') setEditEquipment(prev => c ? [...prev, eq.id] : prev.filter(e => e !== eq.id)); }} className="data-[state=checked]:bg-teal-500 border-zinc-300 dark:border-zinc-700" />
                    <Label htmlFor={`eq-${eq.id}`} className="text-sm font-medium cursor-pointer dark:text-zinc-300">{eq.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-bold dark:text-zinc-300 flex items-center"><Calendar className="w-4 h-4 mr-2"/> Sports Annexes (Fatigue)</Label>
              <div className="space-y-3">
                {Object.keys(DAYS).map((dayKey) => (
                  <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 gap-2 text-sm">
                    <span className="font-bold w-28 text-zinc-700 dark:text-zinc-300">{DAYS[dayKey as keyof typeof DAYS]}</span>
                    <div className="flex flex-wrap gap-3">
                      {EXTRA_SPORTS.map((sport) => {
                        const isChecked = (editSchedule[dayKey] as string[] || []).includes(sport.id);
                        return (
                          <div key={sport.id} className="flex items-center space-x-1.5">
                            <Checkbox id={`edit-${dayKey}-${sport.id}`} checked={isChecked} onCheckedChange={(c) => { if (typeof c === 'boolean') handleSportToggle(dayKey, sport.id, c); }} className="dark:border-zinc-700 dark:data-[state=checked]:bg-teal-500" />
                            <Label htmlFor={`edit-${dayKey}-${sport.id}`} className="text-xs cursor-pointer dark:text-zinc-400">{sport.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PRÉFÉRENCES */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-green-500"/> Préférences & Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="space-y-0.5">
                <Label className="text-base font-bold dark:text-zinc-100 flex items-center"><Brain className="w-4 h-4 mr-2 text-indigo-500" /> Daily Brain Gain</Label>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Afficher les quiz sur l'accueil</p>
              </div>
              <button type="button" onClick={() => setEditDisableQuiz(!editDisableQuiz)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!editDisableQuiz ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!editDisableQuiz ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="space-y-0.5">
                <Label className="text-base font-bold dark:text-zinc-100 flex items-center"><BellRing className="w-4 h-4 mr-2 text-orange-500" /> Notifications Push</Label>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Recevoir des rappels d'entraînement</p>
              </div>
              <button type="button" onClick={togglePushNotifications} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPushEnabled ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 🛡️ ZONE DE SAUVEGARDE ET RECALIBRAGE */}
        <div className="sticky bottom-20 md:bottom-4 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl p-4 rounded-2xl border border-teal-500/30 shadow-[0_10px_40px_-10px_rgba(20,184,166,0.3)] flex flex-col space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
            <Checkbox id="recal-settings" checked={recalibrateAI} onCheckedChange={(c) => setRecalibrateAI(c as boolean)} className="border-teal-500 data-[state=checked]:bg-teal-500 w-5 h-5" />
            <Label htmlFor="recal-settings" className="text-sm font-black text-teal-700 dark:text-teal-400 cursor-pointer">
              {txt.recalc} <span className="font-medium text-xs ml-2 opacity-80">(Cochez si vos dispos ou équipements ont changé)</span>
            </Label>
          </div>
          <Button onClick={handleUpdateProfile} disabled={actionLoading} className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-black text-lg shadow-lg shadow-teal-500/20">
            {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6 mr-2" /> {txt.save}</>}
          </Button>
        </div>

        {/* ZONE DE DANGER */}
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 shadow-sm mt-12">
          <CardHeader><CardTitle className="text-red-600 dark:text-red-500 flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> {txt.danger}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-bold text-red-700/80 dark:text-red-400/80">Cette action supprimera définitivement toutes vos données, photos, historiques et programmes. Tapez "{txt.deleteWarn.split("'")[1]}" pour confirmer.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="bg-white dark:bg-zinc-950 border-red-200 dark:border-red-900 font-bold" placeholder={txt.deleteWarn.split("'")[1]} />
              <Button variant="destructive" onClick={handleDeleteProfile} disabled={(deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") || actionLoading} className="font-bold sm:w-auto w-full">
                <Trash2 className="w-4 h-4 mr-2" /> {txt.deleteAcc}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}