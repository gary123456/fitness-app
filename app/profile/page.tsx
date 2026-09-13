"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
// 🛡️ CORRECTION : Ajout de Move et Trash2 pour le menu Avatar
import { Trophy, Flame, Award, Star, Target, Zap, Loader2, Brain, BookOpen, GraduationCap, Camera, ChevronRight, Lock, CheckCircle2, Move, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface GamificationData {
  level: number;
  current_xp: number;
  streak_days: number;
  unlocked_badges: string[];
  answered_quizzes?: string[];
}

interface ProfileData {
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

const FORGE_BADGES = [
  { id: "first_step", name: "Premier Pas", icon: Star, color: "text-yellow-400", req: "Terminer votre première séance." },
  { id: "streak_fer", name: "Régularité : Fer", icon: Flame, color: "text-zinc-400", req: "Atteindre 3 jours de série." },
  { id: "streak_bronze", name: "Régularité : Bronze", icon: Flame, color: "text-amber-600", req: "Atteindre 7 jours de série." },
  { id: "streak_argent", name: "Régularité : Argent", icon: Flame, color: "text-slate-300", req: "Atteindre 21 jours de série." },
  { id: "streak_or", name: "Régularité : Or", icon: Flame, color: "text-yellow-500", req: "Atteindre 90 jours de série." },
  { id: "streak_diamant", name: "Régularité : Diamant", icon: Flame, color: "text-cyan-300", req: "Atteindre 365 jours de série." },
  { id: "level_fer", name: "Niveau : Fer", icon: Zap, color: "text-zinc-400", req: "Atteindre le Niveau 5." },
  { id: "level_bronze", name: "Niveau : Bronze", icon: Zap, color: "text-amber-600", req: "Atteindre le Niveau 10." },
  { id: "level_argent", name: "Niveau : Argent", icon: Zap, color: "text-slate-300", req: "Atteindre le Niveau 25." },
  { id: "level_or", name: "Niveau : Or", icon: Zap, color: "text-yellow-500", req: "Atteindre le Niveau 50." },
  { id: "level_diamant", name: "Niveau : Diamant", icon: Zap, color: "text-cyan-300", req: "Atteindre le Niveau 100." },
  { id: "warrior", name: "Warrior", icon: Trophy, color: "text-teal-400", req: "Ancien Badge Niveau 5." },
  { id: "constance", name: "Constance", icon: Flame, color: "text-orange-500", req: "Ancien Badge 7 Jours." },
  { id: "titan", name: "Titan", icon: Zap, color: "text-blue-400", req: "Ancien Badge Niveau 10." },
  { id: "legend", name: "Légende", icon: Award, color: "text-purple-400", req: "Ancien Badge 30 Jours." },
];

const ACADEMY_BADGES = [
  { id: "quiz_fer", name: "Savoir : Fer", icon: BookOpen, color: "text-zinc-400", req: "Répondre à 5 Quiz." },
  { id: "quiz_bronze", name: "Savoir : Bronze", icon: Brain, color: "text-amber-600", req: "Répondre à 15 Quiz." },
  { id: "quiz_argent", name: "Savoir : Argent", icon: GraduationCap, color: "text-slate-300", req: "Répondre à 30 Quiz." },
  { id: "quiz_or", name: "Savoir : Or", icon: Trophy, color: "text-yellow-500", req: "Répondre à 60 Quiz." },
  { id: "quiz_diamant", name: "Savoir : Diamant", icon: Award, color: "text-cyan-300", req: "Répondre à 100 Quiz." },
  { id: "quiz_initie", name: "Initié", icon: BookOpen, color: "text-cyan-400", req: "Ancien Badge 5 Quiz." },
  { id: "quiz_erudit", name: "Érudit", icon: Brain, color: "text-fuchsia-400", req: "Ancien Badge 15 Quiz." },
  { id: "quiz_genie", name: "Génie", icon: GraduationCap, color: "text-yellow-500", req: "Ancien Badge 30 Quiz." },
];

export default function ProfilePage() {
  const { lang } = useLanguage();
  const [data, setData] = useState<GamificationData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'forge' | 'academy'>('forge');
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [showXpModal, setShowXpModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  
  // 🛡️ ÉTATS POUR LE RECADRAGE DE L'AVATAR
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropPos, setCropPos] = useState({ x: 50, y: 50 });
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Extraction silencieuse des coordonnées CSS sauvées dans l'URL
  useEffect(() => {
    if (showCropModal && profile?.avatar_url && profile.avatar_url.startsWith('http')) {
      try {
        const url = new URL(profile.avatar_url);
        setCropPos({
          x: parseInt(url.searchParams.get('px') || '50'),
          y: parseInt(url.searchParams.get('py') || '50')
        });
      } catch (e) {
        setCropPos({ x: 50, y: 50 });
      }
    }
  }, [showCropModal, profile?.avatar_url]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [gamificationRes, profileRes] = await Promise.all([
        supabase.from("user_gamification").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single()
      ]);

      let gamification = gamificationRes.data;
      if (!gamification) {
        const { data: newGamification } = await supabase.from("user_gamification").insert([{ user_id: user.id }]).select().single();
        gamification = newGamification;
      }

      setData(gamification);
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🛡️ NOUVEAU : FONCTION DE NETTOYAGE DU BUCKET SUPABASE
  const deleteOldAvatarFile = async (url: string | undefined) => {
    if (!url || !url.includes('avatars/')) return;
    try {
      const oldPath = url.split('avatars/')[1]?.split('?')[0];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'ancien avatar", error);
    }
  };

  const handleAvatarUpload = async (event: any) => {
    try {
      setUploadingAvatar(true);
      const file = event.target.files[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // 1. Suppression physique de l'ancienne photo du Bucket Supabase
      await deleteOldAvatarFile(profile?.avatar_url);

      // 2. Upload de la nouvelle photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      // 3. Récupération URL + Injection des coordonnées CSS de centrage
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}&px=50&py=50`;
      
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null);
    } catch (error: any) {
      alert("Erreur lors de l'upload de l'image : " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 🛡️ NOUVEAU : FONCTION DE SUPPRESSION TOTALE
  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await deleteOldAvatarFile(profile?.avatar_url);

      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: undefined } : null);
    } catch (error: any) {
      alert("Erreur de suppression : " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 🛡️ NOUVEAU : FONCTION DE SAUVEGARDE DU CADRAGE
  const saveCropPosition = async () => {
    try {
      setIsSavingCrop(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.avatar_url) return;

      const url = new URL(profile.avatar_url);
      url.searchParams.set('px', cropPos.x.toString());
      url.searchParams.set('py', cropPos.y.toString());
      url.searchParams.set('t', Date.now().toString()); // Cache busting pour forcer le rafraîchissement
      const newUrl = url.toString();

      await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null);
      setShowCropModal(false);
    } catch (error: any) {
      alert("Erreur d'ajustement : " + error.message);
    } finally {
      setIsSavingCrop(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>;
  }

  if (!data || !profile) {
    return <div className="flex min-h-[80vh] items-center justify-center font-bold text-zinc-500">Impossible de charger le profil.</div>;
  }

  const nextLevelXP = data.level * 1000;
  const xpProgress = Math.min((data.current_xp / nextLevelXP) * 100, 100);
  const totalQuiz = data.answered_quizzes?.length || 0;

  let honorificTitle = lang === 'FR' ? "Athlète Débutant" : "Beginner Athlete";
  if (data.level >= 10 && totalQuiz >= 30) honorificTitle = lang === 'FR' ? "Légende Biomécanique 🧬" : "Biomechanical Legend 🧬";
  else if (data.level >= 10) honorificTitle = lang === 'FR' ? "Titan de la Forge ⚡" : "Titan of the Forge ⚡";
  else if (totalQuiz >= 15) honorificTitle = lang === 'FR' ? "Érudit du Fitness 🧠" : "Fitness Scholar 🧠";
  else if (data.level >= 5) honorificTitle = lang === 'FR' ? "Guerrier Actif ⚔️" : "Active Warrior ⚔️";

  const isAvatarUrl = profile.avatar_url?.startsWith('http') || profile.avatar_url?.startsWith('data:');
  
  // Lecture des coordonnées pour l'affichage principal
  let posX = '50', posY = '50';
  if (isAvatarUrl && profile.avatar_url) {
    try {
      const u = new URL(profile.avatar_url);
      posX = u.searchParams.get('px') || '50';
      posY = u.searchParams.get('py') || '50';
    } catch (e) {}
  }

  const renderBadgeGrid = (badges: any[]) => {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-6">
        {badges.map((badge) => {
          const isUnlocked = data.unlocked_badges?.includes(badge.id);
          const Icon = badge.icon;
          
          return (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge({ ...badge, isUnlocked })}
              className={`cursor-pointer flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                isUnlocked
                  ? `border-${badge.color.split('-')[1]}-500/30 bg-white dark:bg-zinc-900 shadow-[0_0_15px_rgba(20,184,166,0.1)] hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]`
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 opacity-60 hover:opacity-100"
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center relative ${isUnlocked ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-900'}`}>
                {isUnlocked ? (
                  <Icon className={`w-6 h-6 ${badge.color} drop-shadow-md`} />
                ) : (
                  <Lock className="w-5 h-5 text-zinc-400" />
                )}
                {isUnlocked && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight ${isUnlocked ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
                {badge.name}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24">
      
      <div className="flex flex-col items-center justify-center space-y-4 pt-4 pb-8 border-b border-zinc-200 dark:border-zinc-800">
        
        {/* 🛡️ NOUVEAU : DROPDOWN MENU SUR L'AVATAR */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative group cursor-pointer outline-none">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-teal-500 shadow-[0_0_30px_rgba(20,184,166,0.3)] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center relative z-10">
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                ) : isAvatarUrl ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" style={{ objectPosition: `${posX}% ${posY}%` }} />
                ) : profile.avatar_url ? (
                  <span className="text-6xl">{profile.avatar_url}</span>
                ) : (
                  <span className="text-4xl font-black text-zinc-300 dark:text-zinc-700 uppercase">{profile.first_name.charAt(0)}{profile.last_name.charAt(0)}</span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-2xl">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer font-bold rounded-xl p-3 focus:bg-zinc-100 dark:focus:bg-zinc-900 outline-none">
              <Camera className="w-4 h-4 mr-3 text-teal-500" /> {lang === 'FR' ? "Changer la photo" : "Change photo"}
            </DropdownMenuItem>
            {isAvatarUrl && (
              <DropdownMenuItem onClick={() => setShowCropModal(true)} className="cursor-pointer font-bold rounded-xl p-3 focus:bg-zinc-100 dark:focus:bg-zinc-900 outline-none">
                <Move className="w-4 h-4 mr-3 text-indigo-500" /> {lang === 'FR' ? "Centrer l'image" : "Adjust position"}
              </DropdownMenuItem>
            )}
            {profile.avatar_url && (
              <>
                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/50" />
                <DropdownMenuItem onClick={handleRemoveAvatar} className="cursor-pointer font-bold text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 rounded-xl p-3 outline-none">
                  <Trash2 className="w-4 h-4 mr-3" /> {lang === 'FR' ? "Supprimer" : "Remove"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Input fichier caché pour déclencher l'upload depuis le menu */}
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
        
        <div className="text-center">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{profile.first_name} {profile.last_name}</h1>
          <p className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">{honorificTitle}</p>
        </div>
      </div>

      {/* 🛡️ STATISTIQUES CLIQUABLES (QOL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div onClick={() => setShowXpModal(true)} className="cursor-pointer p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-teal-500/50 transition-all group relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                <span className="text-lg font-black text-white">{data.level}</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">{lang === 'FR' ? "Niveau" : "Level"}</h2>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{data.current_xp} / {nextLevelXP} XP</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-teal-500 transition-colors" />
          </div>
          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-1000" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>

        <div onClick={() => setShowStreakModal(true)} className="cursor-pointer p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all group relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">{lang === 'FR' ? "Régularité" : "Consistency"}</h2>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{lang === 'FR' ? "Série en cours" : "Current streak"}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-3xl font-black text-orange-500">{data.streak_days}</span>
              <span className="text-xs font-bold text-orange-500/50 uppercase">Jours</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🛡️ SYSTÈME D'ONGLETS POUR LES BADGES */}
      <div className="pt-4">
        <div className="flex space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-px">
          <button 
            onClick={() => setActiveTab('forge')}
            className={`px-6 py-3 font-black text-sm uppercase tracking-widest transition-all rounded-t-xl ${activeTab === 'forge' ? 'bg-zinc-100 dark:bg-zinc-900 text-teal-600 dark:text-teal-400 border-t border-l border-r border-zinc-200 dark:border-zinc-800' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            🏋️ {lang === 'FR' ? "La Forge" : "The Forge"}
          </button>
          <button 
            onClick={() => setActiveTab('academy')}
            className={`px-6 py-3 font-black text-sm uppercase tracking-widest transition-all rounded-t-xl ${activeTab === 'academy' ? 'bg-zinc-100 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-t border-l border-r border-zinc-200 dark:border-zinc-800' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            🧠 {lang === 'FR' ? "Académie" : "Academy"}
          </button>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-l border-r border-zinc-200 dark:border-zinc-800 rounded-b-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {activeTab === 'forge' ? (lang === 'FR' ? "Exploits Athlétiques" : "Athletic Feats") : (lang === 'FR' ? "Exploits Intellectuels" : "Intellectual Feats")}
            </h3>
            <span className="text-xs font-black bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-600 dark:text-zinc-400">
              {data.unlocked_badges?.filter(b => (activeTab === 'forge' ? FORGE_BADGES : ACADEMY_BADGES).some(x => x.id === b)).length || 0} / {(activeTab === 'forge' ? FORGE_BADGES : ACADEMY_BADGES).length}
            </span>
          </div>
          
          {activeTab === 'forge' ? renderBadgeGrid(FORGE_BADGES) : renderBadgeGrid(ACADEMY_BADGES)}
        </div>
      </div>

      {/* 📘 MODALE D'AJUSTEMENT DU RECADRAGE DE L'AVATAR */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400">{lang === 'FR' ? "Centrer la photo" : "Adjust photo"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-8">
            <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-teal-500 shadow-2xl bg-zinc-100 dark:bg-zinc-900">
               <img src={profile?.avatar_url} style={{ objectPosition: `${cropPos.x}% ${cropPos.y}%` }} className="w-full h-full object-cover transition-all" alt="Preview" />
            </div>
            <div className="space-y-6 px-4">
               <div className="space-y-3">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                    <span>{lang === 'FR' ? "Horizontal (X)" : "Horizontal (X)"}</span>
                    <span className="text-teal-500">{cropPos.x}%</span>
                  </Label>
                  <input type="range" min="0" max="100" value={cropPos.x} onChange={e => setCropPos({...cropPos, x: parseInt(e.target.value)})} className="w-full accent-teal-500 cursor-pointer" />
               </div>
               <div className="space-y-3">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                    <span>{lang === 'FR' ? "Vertical (Y)" : "Vertical (Y)"}</span>
                    <span className="text-teal-500">{cropPos.y}%</span>
                  </Label>
                  <input type="range" min="0" max="100" value={cropPos.y} onChange={e => setCropPos({...cropPos, y: parseInt(e.target.value)})} className="w-full accent-teal-500 cursor-pointer" />
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveCropPosition} disabled={isSavingCrop} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold h-12 text-lg rounded-xl">
              {isSavingCrop ? <Loader2 className="w-5 h-5 animate-spin" /> : (lang === 'FR' ? "Enregistrer" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 📘 MODALE DÉTAILS D'UN BADGE */}
      <Dialog open={selectedBadge !== null} onOpenChange={(open) => !open && setSelectedBadge(null)}>
        <DialogContent className={`sm:max-w-[400px] border-none rounded-3xl overflow-hidden p-0 ${selectedBadge?.isUnlocked ? 'bg-gradient-to-b from-yellow-500/20 to-zinc-950' : 'bg-zinc-950'}`}>
          <div className="p-8 flex flex-col items-center justify-center text-center relative">
            <div className="absolute top-0 right-0 p-4">
              {selectedBadge?.isUnlocked ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Lock className="w-6 h-6 text-zinc-600" />}
            </div>
            
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl ${selectedBadge?.isUnlocked ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-zinc-900 border-2 border-zinc-800'}`}>
               {selectedBadge && <selectedBadge.icon className={`w-12 h-12 ${selectedBadge.isUnlocked ? 'text-white' : 'text-zinc-600'}`} />}
            </div>
            
            <h2 className={`text-2xl font-black uppercase tracking-widest mb-2 ${selectedBadge?.isUnlocked ? 'text-yellow-500' : 'text-zinc-300'}`}>
              {selectedBadge?.name}
            </h2>
            
            <p className="text-sm font-medium text-zinc-400 mb-6">
              {selectedBadge?.req}
            </p>

            {selectedBadge?.isUnlocked ? (
              <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-500 font-bold text-xs uppercase tracking-widest animate-pulse">
                {lang === 'FR' ? "Débloqué. Félicitations." : "Unlocked. Congratulations."}
              </div>
            ) : (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-500 font-bold text-xs uppercase tracking-widest">
                {lang === 'FR' ? "Verrouillé. Continuez vos efforts." : "Locked. Keep pushing."}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 📘 MODALE JAUGE XP */}
      <Dialog open={showXpModal} onOpenChange={setShowXpModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-xl font-black text-teal-600 dark:text-teal-400">Expérience & Progression</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100 dark:text-zinc-800" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * xpProgress) / 100} className="text-teal-500 transition-all duration-1000" strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">{data.level}</span>
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-500 uppercase tracking-widest">Niveau</span>
              </div>
            </div>
            <div className="text-center w-full">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-300 mb-1">{data.current_xp} / {nextLevelXP} XP</p>
              <p className="text-xs font-medium text-zinc-500">Gagnez de l'XP en soulevant lourd et en répondant aux quiz quotidiens.</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowXpModal(false)} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 📘 MODALE STREAK CALENDAR */}
      <Dialog open={showStreakModal} onOpenChange={setShowStreakModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-xl font-black text-orange-500 flex items-center justify-center"><Flame className="w-5 h-5 mr-2"/> La Chaîne</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="text-center">
              <div className="text-6xl font-black bg-gradient-to-br from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">{data.streak_days}</div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Jours consécutifs</p>
            </div>
            <p className="text-xs font-medium text-zinc-500 text-center px-4">
              L'algorithme augmente vos gains si vous êtes régulier. Ne brisez pas la chaîne.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStreakModal(false)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold">Continuer l'effort</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}