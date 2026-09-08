"use client";

import { useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { compressImageFile } from "@/lib/image-optimizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Ruler, Upload, CheckCircle2, ArrowLeftRight, Image as ImageIcon, Loader2, Trash2, Maximize2, X, Trophy, Info, Edit3 } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

const BeforeAfterSlider = ({ before, after }: { before: string, after: string }) => {
  const [sliderPos, setSliderPos] = useState(50);
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <img src={after} className="absolute inset-0 w-full h-full object-cover" alt="After" />
      <div className="absolute inset-0 h-full overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={before} className="absolute inset-0 w-[384px] max-w-none h-full object-cover" alt="Before" style={{ width: '100vw', maxWidth: '384px' }} /> 
      </div>
      <div className="absolute inset-0 w-full h-full">
        <input type="range" min="0" max="100" value={sliderPos} onChange={(e)=>setSliderPos(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20" />
        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 pointer-events-none" style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"><ArrowLeftRight className="w-4 h-4 text-teal-500" /></div>
        </div>
      </div>
    </div>
  );
};

const fetchProgressData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { data: profile } = await supabase.from("profiles").select("gender, weight_kg").eq("id", user.id).single();
  const { data: measurements } = await supabase.from("measurements").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const { data: photos } = await supabase.from("progress_photos").select("*").eq("user_id", user.id).order("date", { ascending: true });

  const validMeasurements = measurements?.filter(m => m.weight_kg > 0 || m.arms_cm > 0 || m.chest_cm > 0 || m.waist_cm > 0 || m.thighs_cm > 0) || [];

  const photosWithSignedUrls = await Promise.all((photos || []).map(async (p: any) => {
    const newP = { ...p };
    for (const type of ['front', 'side', 'back']) {
      let path = p[`${type}_photo_url`];
      if (!path) continue;
      if (path.includes('/storage/v1/object/public/progress-photos/')) {
        path = path.split('/storage/v1/object/public/progress-photos/')[1];
      }
      const { data } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600);
      newP[`${type}_signed_url`] = data?.signedUrl || null;
    }
    return newP;
  }));

  const lastWeightMeas = measurements?.find(m => m.weight_kg !== null);
  let daysSinceLastWeighIn = 0;
  if (lastWeightMeas) {
    const lastDate = new Date(lastWeightMeas.created_at);
    daysSinceLastWeighIn = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
  } else {
    daysSinceLastWeighIn = 999;
  }

  return { user, gender: profile?.gender || 'homme', currentWeight: profile?.weight_kg, measurements: validMeasurements, photos: photosWithSignedUrls, daysSinceLastWeighIn };
};

export default function ProgressPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"measurements" | "photos" | "compare">("measurements");
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ÉTATS DES MENSURATIONS
  const [weight, setWeight] = useState("");
  const [arms, setArms] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [thighs, setThighs] = useState("");
  
  // 🛡️ NOUVEAU : GESTION DE L'ÉDITION
  const [editingMeasId, setEditingMeasId] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [wizardFiles, setWizardFiles] = useState<{ front: File | null, side: File | null, back: File | null }>({ front: null, side: null, back: null });
  const [wizardPreviews, setWizardPreviews] = useState<{ front: string, side: string, back: string }>({ front: "", side: "", back: "" });

  const [compareBefore, setCompareBefore] = useState("");
  const [compareAfter, setCompareAfter] = useState("");
  const [compareMeasA, setCompareMeasA] = useState("");
  const [compareMeasB, setCompareMeasB] = useState("");
  
  const [enlargeModal, setEnlargeModal] = useState({ show: false, url: "" });
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const t = {
    FR: { title: "Progression & Métriques", sub: "Suivez votre évolution corporelle en toute indépendance.", measure: "Mensurations", photos: "Galerie Photos", compare: "Comparateur", weight: "Poids (kg)", arms: "Bras (cm)", chest: "Poitrine (cm)", waist: "Taille (cm)", thighs: "Cuisses (cm)", save: "Enregistrer", update: "Mettre à jour", newEvo: "Nouvelle Évolution", success: "Succès !", successMsgMeas: "Mesures sauvegardées. L'algorithme a été recalibré.", successMsgPhoto: "Photos ajoutées avec succès.", noPhoto: "Aucune photo.", delWarn: "Supprimer cette donnée ?", selectBefore: "Choisir Avant", selectAfter: "Choisir Après", face: "Photo de Face", side: "Photo de Profil", back: "Photo de Dos", next: "Suivant", finish: "Terminer & Sauvegarder", noMeas: "Aucune mensuration.", diff: "Évolution", emptyMeasErr: "Veuillez remplir au moins une mesure.", cancel: "Annuler", upload: "Uploader", ok: "OK", proto: "Protocole Scientifique", protoDesc: "Le poids fluctue de 1 à 2kg par jour (eau, glycogène). Pesez-vous idéalement 1 seule fois par semaine, le matin à jeun." },
    EN: { title: "Progress & Metrics", sub: "Track your body evolution independently.", measure: "Measurements", photos: "Photo Gallery", compare: "Comparator", weight: "Weight (kg)", arms: "Arms (cm)", chest: "Chest (cm)", waist: "Waist (cm)", thighs: "Thighs (cm)", save: "Save", update: "Update", newEvo: "New Evolution", success: "Success!", successMsgMeas: "Measurements saved. Algorithm recalibrated.", successMsgPhoto: "Photos added successfully.", noPhoto: "No photos.", delWarn: "Delete this data?", selectBefore: "Select Before", selectAfter: "Select After", face: "Front Photo", side: "Side Photo", back: "Back Photo", next: "Next", finish: "Finish & Save", noMeas: "No measurements.", diff: "Evolution", emptyMeasErr: "Please fill in at least one measurement.", cancel: "Cancel", upload: "Upload", ok: "OK", proto: "Scientific Protocol", protoDesc: "Weight fluctuates 1-2kg daily (water, glycogen). Ideally, weigh yourself only once a week, in the morning on an empty stomach." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const { data, mutate, isLoading } = useSWR('progressData', fetchProgressData, {
    onSuccess: (res) => {
      if (res.measurements.length > 0 && !weight && !arms && !chest && !waist && !thighs && !editingMeasId) { 
        setWeight(res.currentWeight?.toString() || res.measurements[0].weight_kg?.toString() || "");
        setArms(res.measurements[0].arms_cm?.toString() || "");
        setChest(res.measurements[0].chest_cm?.toString() || "");
        setWaist(res.measurements[0].waist_cm?.toString() || "");
        setThighs(res.measurements[0].thighs_cm?.toString() || "");
      }
    }
  });

  const handleSaveMeasurements = async () => {
    if (!data?.user) return;
    
    const w = parseFloat(weight) || 0;
    const a = parseFloat(arms) || 0;
    const c = parseFloat(chest) || 0;
    const wa = parseFloat(waist) || 0;
    const th = parseFloat(thighs) || 0;

    if (w === 0 && a === 0 && c === 0 && wa === 0 && th === 0) {
      alert(txt.emptyMeasErr); return;
    }

    setSaving(true);
    
    // 🛡️ LOGIQUE ARCHITECTURALE : UPDATE ou INSERT
    const payload = { 
      weight_kg: w || null, 
      arms_cm: a || null, 
      chest_cm: c || null, 
      waist_cm: wa || null, 
      thighs_cm: th || null 
    };

    if (editingMeasId) {
      await supabase.from("measurements").update(payload).eq("id", editingMeasId);
    } else {
      await supabase.from("measurements").insert([{ user_id: data.user.id, ...payload }]);
    }

    if (w > 0) {
      await supabase.from("profiles").update({ weight_kg: w }).eq("id", data.user.id);
    }

    await mutate(); 
    setSaving(false);
    setEditingMeasId(null); // On sort du mode édition
    
    setSuccessMessage(txt.successMsgMeas);
    setShowSuccessModal(true);
  };

  const handleEditMeas = (m: any) => {
    setEditingMeasId(m.id);
    setWeight(m.weight_kg?.toString() || "");
    setArms(m.arms_cm?.toString() || "");
    setChest(m.chest_cm?.toString() || "");
    setWaist(m.waist_cm?.toString() || "");
    setThighs(m.thighs_cm?.toString() || "");
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Remonte l'utilisateur vers le formulaire
  };

  const handleDeleteMeas = async (id: string) => {
    if (!confirm(txt.delWarn)) return;
    await supabase.from("measurements").delete().eq("id", id);
    if (editingMeasId === id) setEditingMeasId(null);
    mutate();
  };

  const handleDeletePhotoCard = async (id: string) => {
    if (!confirm(txt.delWarn)) return;
    await supabase.from("progress_photos").delete().eq("id", id);
    mutate();
  };

  const handleWizardFile = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "side" | "back") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setWizardFiles(prev => ({ ...prev, [type]: file }));
      setWizardPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
    }
  };

  const handleSaveWizard = async () => {
    if (!data?.user) return;
    setUploading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload: any = {};
      
      for (const type of ["front", "side", "back"] as const) {
        if (wizardFiles[type]) {
          const compressedFile = await compressImageFile(wizardFiles[type]!);
          const fileExt = compressedFile.name.split('.').pop() || 'jpg';
          const fileName = `${data.user.id}/${Date.now()}_${type}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('progress-photos').upload(fileName, compressedFile);
          if (uploadError) throw uploadError;
          payload[`${type}_photo_url`] = fileName;
        }
      }

      if (Object.keys(payload).length > 0) {
        await supabase.from("progress_photos").insert([{ user_id: data.user.id, date: today, ...payload }]);
      }

      await mutate();
      setWizardOpen(false);
      setWizardStep(0);
      setWizardFiles({ front: null, side: null, back: null });
      setWizardPreviews({ front: "", side: "", back: "" });
      
      setSuccessMessage(txt.successMsgPhoto);
      setShowSuccessModal(true);
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24 animate-pulse">
        <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        <div className="flex gap-2"><div className="h-10 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div><div className="h-10 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div><div className="h-10 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div></div>
        <div className="h-[400px] w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
      </div>
    );
  }

  const photos = data?.photos || [];
  const measurements = data?.measurements || [];
  const genderPrefix = data?.gender === 'femme' ? 'femme' : 'homme';

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full pb-24">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center"><Camera className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
      </div>

      <div className="grid w-full grid-cols-3 bg-zinc-200/50 dark:bg-zinc-900 rounded-xl p-1 mb-6 shadow-inner">
        <button onClick={() => setActiveTab("measurements")} className={`flex items-center justify-center py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "measurements" ? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}><Ruler className="w-4 h-4 mr-2 hidden sm:block" /> {txt.measure}</button>
        <button onClick={() => setActiveTab("photos")} className={`flex items-center justify-center py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "photos" ? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}><ImageIcon className="w-4 h-4 mr-2 hidden sm:block" /> {txt.photos}</button>
        <button onClick={() => setActiveTab("compare")} className={`flex items-center justify-center py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "compare" ? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}><ArrowLeftRight className="w-4 h-4 mr-2 hidden sm:block" /> {txt.compare}</button>
      </div>
      
      {activeTab === "measurements" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex space-x-4 shadow-sm">
            <Info className="w-6 h-6 text-blue-500 shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <span className="font-black block mb-1 uppercase tracking-widest text-xs text-blue-600 dark:text-blue-400">{txt.proto}</span>
              <span className="font-medium">{txt.protoDesc}</span>
            </div>
          </div>

          <Card className={`shadow-lg transition-all duration-300 ${editingMeasId ? 'border-orange-500 shadow-orange-500/10 ring-1 ring-orange-500' : 'border-zinc-200 dark:border-zinc-800'} bg-white dark:bg-zinc-900`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{txt.measure} {editingMeasId && <span className="text-orange-500 text-sm ml-2">(Édition en cours)</span>}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <Label className="font-black text-teal-600 dark:text-teal-500 uppercase tracking-widest mb-2 block">{txt.weight}</Label>
                <Input type="number" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} className="font-black text-2xl h-14 dark:bg-zinc-900 dark:border-zinc-700 text-zinc-900 dark:text-white" placeholder="0.0" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.arms}</Label><Input type="number" value={arms} onChange={e=>setArms(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
                <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.chest}</Label><Input type="number" value={chest} onChange={e=>setChest(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
                <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.waist}</Label><Input type="number" value={waist} onChange={e=>setWaist(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
                <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.thighs}</Label><Input type="number" value={thighs} onChange={e=>setThighs(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
              </div>

              <div className="flex space-x-3 pt-2">
                {editingMeasId && (
                  <Button variant="outline" onClick={() => {
                    setEditingMeasId(null);
                    setWeight(measurements[0]?.weight_kg?.toString() || "");
                    setArms(measurements[0]?.arms_cm?.toString() || "");
                    setChest(measurements[0]?.chest_cm?.toString() || "");
                    setWaist(measurements[0]?.waist_cm?.toString() || "");
                    setThighs(measurements[0]?.thighs_cm?.toString() || "");
                  }} className="flex-1 border-zinc-200 dark:border-zinc-700 font-bold h-14">
                    {txt.cancel}
                  </Button>
                )}
                <Button onClick={handleSaveMeasurements} disabled={saving} className={`flex-[2] h-14 text-white font-black shadow-lg text-lg ${editingMeasId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/20'}`}>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> {saving ? "..." : (editingMeasId ? txt.update : txt.save)}
                </Button>
              </div>

            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {measurements.map((m: any) => (
              <Card key={m.id} className={`shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all ${editingMeasId === m.id ? 'ring-2 ring-orange-500' : ''}`}>
                <CardHeader className="p-4 bg-zinc-50 dark:bg-zinc-900/50 flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold text-teal-600 dark:text-teal-400">
                    {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </CardTitle>
                  <div className="flex space-x-1">
                    <button onClick={() => handleEditMeas(m)} className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-md transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMeas(m.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {m.weight_kg && <div className="col-span-2 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg flex justify-between font-bold text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900"><span>{txt.weight}</span><span>{m.weight_kg} kg</span></div>}
                  <div>{txt.arms}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{m.arms_cm || '-'}</span></div>
                  <div>{txt.chest}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{m.chest_cm || '-'}</span></div>
                  <div>{txt.waist}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{m.waist_cm || '-'}</span></div>
                  <div>{txt.thighs}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{m.thighs_cm || '-'}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "photos" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <Button onClick={() => setWizardOpen(true)} className="w-full h-14 bg-gradient-to-r from-teal-400 to-teal-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-teal-500/30">
            <Camera className="w-5 h-5 mr-2" /> {txt.newEvo}
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...photos].reverse().map((entry: any) => (
              <Card key={entry.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md">
                <CardHeader className="p-3 bg-zinc-50 dark:bg-zinc-900/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-teal-600 dark:text-teal-400">
                    {new Date(entry.created_at || entry.date).toLocaleDateString()} {entry.created_at && new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </CardTitle>
                  <button onClick={() => handleDeletePhotoCard(entry.id)} className="p-1 text-zinc-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </CardHeader>
                <CardContent className="p-0 grid grid-cols-3 gap-0.5 bg-zinc-100 dark:bg-zinc-800">
                  {['front', 'side', 'back'].map((type) => (
                    <div key={type} className="aspect-[3/4] bg-zinc-200 dark:bg-zinc-900 flex items-center justify-center relative overflow-hidden group cursor-pointer" onClick={() => entry[`${type}_signed_url`] && setEnlargeModal({ show: true, url: entry[`${type}_signed_url`] })}>
                      {entry[`${type}_signed_url`] ? (
                        <>
                          <img src={entry[`${type}_signed_url`]} alt={type} className="object-cover w-full h-full" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-5 h-5 text-white" /></div>
                        </>
                      ) : (<ImageIcon className="w-4 h-4 text-zinc-400 opacity-50" />)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "compare" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader><CardTitle>{txt.photos}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label>{txt.selectBefore}</Label>
                  <select value={compareBefore} onChange={(e) => setCompareBefore(e.target.value)} className="w-full p-2 rounded-md border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 font-medium">
                    <option value="">-- {txt.selectBefore} --</option>
                    {photos.map((p:any) => p.front_signed_url && <option key={`b-${p.id}`} value={p.front_signed_url}>{new Date(p.created_at || p.date).toLocaleDateString()} {p.created_at && new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>{txt.selectAfter}</Label>
                  <select value={compareAfter} onChange={(e) => setCompareAfter(e.target.value)} className="w-full p-2 rounded-md border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 font-medium">
                    <option value="">-- {txt.selectAfter} --</option>
                    {photos.map((p:any) => p.front_signed_url && <option key={`a-${p.id}`} value={p.front_signed_url}>{new Date(p.created_at || p.date).toLocaleDateString()} {p.created_at && new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>)}
                  </select>
                </div>
              </div>
              {compareBefore && compareAfter ? (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800"><BeforeAfterSlider before={compareBefore} after={compareAfter} /></div>
              ) : (<div className="py-8 flex items-center justify-center text-zinc-400 font-medium border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">{txt.noPhoto}</div>)}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader><CardTitle>{txt.measure}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label>{txt.selectBefore}</Label>
                  <select value={compareMeasA} onChange={(e) => setCompareMeasA(e.target.value)} className="w-full p-2 rounded-md border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 font-medium">
                    <option value="">-- {txt.selectBefore} --</option>
                    {measurements.map((m:any) => <option key={`mb-${m.id}`} value={m.id}>{new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>{txt.selectAfter}</Label>
                  <select value={compareMeasB} onChange={(e) => setCompareMeasB(e.target.value)} className="w-full p-2 rounded-md border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 font-medium">
                    <option value="">-- {txt.selectAfter} --</option>
                    {measurements.map((m:any) => <option key={`ma-${m.id}`} value={m.id}>{new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>)}
                  </select>
                </div>
              </div>

              {compareMeasA && compareMeasB && compareMeasA !== compareMeasB ? (() => {
                const mA = measurements.find((m:any) => m.id === compareMeasA);
                const mB = measurements.find((m:any) => m.id === compareMeasB);
                const diff = (a: number, b: number) => {
                  if (!a || !b) return "-";
                  const d = b - a;
                  return <span className={d > 0 ? "text-green-500" : d < 0 ? "text-blue-500" : "text-zinc-500"}>{d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)}</span>;
                };
                return (
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 gap-3">
                    <div className="flex justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-900/50"><span className="font-black text-teal-700 dark:text-teal-400">{txt.weight}</span><div className="space-x-4"><span className="text-teal-600/70 dark:text-teal-400/70">{mA.weight_kg||'-'} ➔ {mB.weight_kg||'-'}</span> <span className="font-black text-teal-700 dark:text-teal-300">{diff(mA.weight_kg, mB.weight_kg)} kg</span></div></div>
                    <div className="flex justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"><span className="font-bold text-zinc-600 dark:text-zinc-400">{txt.arms}</span><div className="space-x-4"><span className="text-zinc-400">{mA.arms_cm||'-'} ➔ {mB.arms_cm||'-'}</span> <span className="font-black">{diff(mA.arms_cm, mB.arms_cm)} cm</span></div></div>
                    <div className="flex justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"><span className="font-bold text-zinc-600 dark:text-zinc-400">{txt.chest}</span><div className="space-x-4"><span className="text-zinc-400">{mA.chest_cm||'-'} ➔ {mB.chest_cm||'-'}</span> <span className="font-black">{diff(mA.chest_cm, mB.chest_cm)} cm</span></div></div>
                    <div className="flex justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"><span className="font-bold text-zinc-600 dark:text-zinc-400">{txt.waist}</span><div className="space-x-4"><span className="text-zinc-400">{mA.waist_cm||'-'} ➔ {mB.waist_cm||'-'}</span> <span className="font-black">{diff(mA.waist_cm, mB.waist_cm)} cm</span></div></div>
                    <div className="flex justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"><span className="font-bold text-zinc-600 dark:text-zinc-400">{txt.thighs}</span><div className="space-x-4"><span className="text-zinc-400">{mA.thighs_cm||'-'} ➔ {mB.thighs_cm||'-'}</span> <span className="font-black">{diff(mA.thighs_cm, mB.thighs_cm)} cm</span></div></div>
                  </div>
                );
              })() : (<div className="py-8 flex items-center justify-center text-zinc-400 font-medium border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">{txt.noMeas}</div>)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODALES ENLARGE / SUCCESS / WIZARD INCHANGÉES */}
      <Dialog open={enlargeModal.show} onOpenChange={(open) => !open && setEnlargeModal({ show: false, url: "" })}>
        <DialogContent className="max-w-3xl w-full bg-black/95 border-none p-0 flex justify-center items-center h-[100dvh] sm:h-auto overflow-hidden">
          <button onClick={() => setEnlargeModal({ show: false, url: "" })} className="absolute top-12 right-6 sm:top-4 sm:right-4 z-50 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 backdrop-blur-md">
            <X className="w-6 h-6" />
          </button>
          {enlargeModal.url !== "" && (
            <img src={enlargeModal.url} onClick={() => setEnlargeModal({ show: false, url: "" })} className="w-full h-full sm:w-auto sm:h-auto max-h-[100dvh] max-w-full object-contain cursor-pointer" alt="Enlarged" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 sm:max-w-md">
          <DialogTitle className="sr-only">Succès</DialogTitle>
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center mb-4"><Trophy className="w-8 h-8 text-teal-600 dark:text-teal-400" /></div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">{txt.success}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">{successMessage}</p>
            <Button onClick={() => setShowSuccessModal(false)} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold">{txt.ok}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={wizardOpen} onOpenChange={(open) => !open && setWizardOpen(false)}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-teal-600 dark:text-teal-400">
              {wizardStep === 0 && txt.face}
              {wizardStep === 1 && txt.side}
              {wizardStep === 2 && txt.back}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-full max-w-[250px] aspect-[3/4] bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative shadow-inner">
              {wizardStep === 0 && (wizardPreviews.front ? <img src={wizardPreviews.front} className="w-full h-full object-cover" /> : <img src={`/guide-${genderPrefix}-face.jpg`} className="w-full h-full object-contain opacity-40 dark:opacity-60" />)}
              {wizardStep === 1 && (wizardPreviews.side ? <img src={wizardPreviews.side} className="w-full h-full object-cover" /> : <img src={`/guide-${genderPrefix}-profil.jpg`} className="w-full h-full object-contain opacity-40 dark:opacity-60" />)}
              {wizardStep === 2 && (wizardPreviews.back ? <img src={wizardPreviews.back} className="w-full h-full object-cover" /> : <img src={`/guide-${genderPrefix}-face.jpg`} className="w-full h-full object-contain opacity-40 dark:opacity-60 scale-x-[-1]" />)}
              <input type="file" accept="image/*" onChange={(e) => handleWizardFile(e, wizardStep === 0 ? "front" : wizardStep === 1 ? "side" : "back")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              {!wizardPreviews[wizardStep === 0 ? 'front' : wizardStep === 1 ? 'side' : 'back'] && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                  <Upload className="w-8 h-8 text-teal-500 mb-2 drop-shadow-md" />
                  <span className="bg-white/90 dark:bg-zinc-900/90 px-3 py-1 rounded-full text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-sm">{txt.upload}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-between w-full sm:justify-between">
            <Button variant="outline" onClick={() => {
              if (wizardStep > 0) { setWizardStep(wizardStep - 1); } else { setWizardOpen(false); }
            }} className="dark:border-zinc-700 dark:text-zinc-300">
              {wizardStep > 0 ? "Retour" : txt.cancel}
            </Button>
            {wizardStep < 2 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)} className="bg-teal-500 hover:bg-teal-600 text-white">{txt.next}</Button>
            ) : (
              <Button onClick={handleSaveWizard} disabled={uploading} className="bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/40">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {txt.finish}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}