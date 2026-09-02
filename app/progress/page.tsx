"use client";

import { useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Ruler, Upload, CheckCircle2, ArrowLeftRight, Image as ImageIcon, Loader2 } from "lucide-react";
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
            <ArrowLeftRight className="w-4 h-4 text-teal-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

const fetchProgressData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { data: measurements } = await supabase.from("measurements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
  const { data: photos } = await supabase.from("progress_photos").select("*").eq("user_id", user.id).order("date", { ascending: true });

  return { user, measurements: measurements || [], photos: photos || [] };
};

export default function ProgressPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"measurements" | "photos">("measurements");
  const [photoSubTab, setPhotoSubTab] = useState<"front" | "side" | "back">("front");
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [arms, setArms] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [thighs, setThighs] = useState("");

  const t = {
    FR: { title: "Progression & Métriques", sub: "Suivez votre évolution corporelle en toute indépendance.", measure: "Mensurations", photos: "Photos Avant/Après", arms: "Bras (cm)", chest: "Poitrine (cm)", waist: "Taille (cm)", thighs: "Cuisses (cm)", save: "Enregistrer les mensurations", upload: "Uploader une photo", before: "Photo 'Avant'", after: "Photo 'Après'", noPhoto: "Sélectionnez deux photos pour activer le slider.", success: "Données sauvegardées avec succès !" },
    EN: { title: "Progress & Metrics", sub: "Track your body evolution independently.", measure: "Measurements", photos: "Before/After Photos", arms: "Arms (cm)", chest: "Chest (cm)", waist: "Waist (cm)", thighs: "Thighs (cm)", save: "Save measurements", upload: "Upload a photo", before: "Before Photo", after: "After Photo", noPhoto: "Select two photos to enable the slider.", success: "Data saved successfully!" }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const { data, mutate, isLoading } = useSWR('progressData', fetchProgressData, {
    onSuccess: (res) => {
      if (res.measurements.length > 0 && !arms) { 
        setArms(res.measurements[0].arms_cm?.toString() || "");
        setChest(res.measurements[0].chest_cm?.toString() || "");
        setWaist(res.measurements[0].waist_cm?.toString() || "");
        setThighs(res.measurements[0].thighs_cm?.toString() || "");
      }
    }
  });

  const handleSaveMeasurements = async () => {
    if (!data?.user) return;
    setSaving(true);
    await supabase.from("measurements").insert([{ 
      user_id: data.user.id, 
      arms_cm: parseFloat(arms) || null, 
      chest_cm: parseFloat(chest) || null, 
      waist_cm: parseFloat(waist) || null, 
      thighs_cm: parseFloat(thighs) || null 
    }]);
    setSaving(false);
    alert(txt.success);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadPhoto = async () => {
    if (!file || !data?.user) return;
    setUploading(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${data.user.id}/${Date.now()}_${photoSubTab}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('progress-photos').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('progress-photos').getPublicUrl(fileName);
      const today = new Date().toISOString().split('T')[0];
      const existingEntry = data.photos.find((p: any) => p.date === today);

      if (existingEntry) {
        await supabase.from("progress_photos").update({ [`${photoSubTab}_photo_url`]: publicUrlData.publicUrl }).eq("id", existingEntry.id);
      } else {
        await supabase.from("progress_photos").insert([{ user_id: data.user.id, date: today, [`${photoSubTab}_photo_url`]: publicUrlData.publicUrl }]);
      }

      mutate();
      setFile(null);
      alert(lang === "FR" ? "Photo ajoutée avec succès !" : "Photo successfully added!");
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="flex min-h-[80vh] items-center justify-center font-bold text-teal-500 animate-pulse">Chargement...</div>;

  const photos = data?.photos || [];
  const beforePhoto = photos.length > 0 ? (photos[0].front_photo_url || photos[0].side_photo_url || photos[0].back_photo_url) : null;
  const afterPhoto = photos.length > 1 ? (photos[photos.length - 1].front_photo_url || photos[photos.length - 1].side_photo_url || photos[photos.length - 1].back_photo_url) : beforePhoto;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-4xl mx-auto w-full pb-24">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <Camera className="w-8 h-8 mr-3 text-teal-500" /> {txt.title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">{txt.sub}</p>
      </div>

      {/* CUSTOM NATIVE TABS REPLACING SHADCN */}
      <div className="grid w-full grid-cols-2 bg-zinc-200/50 dark:bg-zinc-900 rounded-xl p-1 mb-6">
        <button 
          onClick={() => setActiveTab("measurements")} 
          className={`flex items-center justify-center py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "measurements" ? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
        >
          <Ruler className="w-4 h-4 mr-2" /> {txt.measure}
        </button>
        <button 
          onClick={() => setActiveTab("photos")} 
          className={`flex items-center justify-center py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "photos" ? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
        >
          <ImageIcon className="w-4 h-4 mr-2" /> {txt.photos}
        </button>
      </div>
      
      {activeTab === "measurements" && (
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-300">
          <CardHeader><CardTitle>{txt.measure}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.arms}</Label><Input type="number" value={arms} onChange={e=>setArms(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
              <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.chest}</Label><Input type="number" value={chest} onChange={e=>setChest(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
              <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.waist}</Label><Input type="number" value={waist} onChange={e=>setWaist(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
              <div className="space-y-2"><Label className="font-bold text-zinc-600 dark:text-zinc-400">{txt.thighs}</Label><Input type="number" value={thighs} onChange={e=>setThighs(e.target.value)} className="font-bold text-lg dark:bg-zinc-950 dark:border-zinc-800" /></div>
            </div>
            <Button onClick={handleSaveMeasurements} disabled={saving} className="w-full bg-teal-500 text-white hover:bg-teal-600 font-bold"><CheckCircle2 className="w-5 h-5 mr-2" /> {saving ? "..." : txt.save}</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "photos" && (
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-300">
          <CardHeader>
            <CardTitle>{txt.photos}</CardTitle>
            <CardDescription>{lang === "FR" ? "Les images seront compressées automatiquement." : "Images will be compressed automatically."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid w-full grid-cols-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
              <button onClick={() => setPhotoSubTab("front")} className={`py-1.5 rounded-md text-sm font-bold transition-all ${photoSubTab === "front" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}>Face</button>
              <button onClick={() => setPhotoSubTab("side")} className={`py-1.5 rounded-md text-sm font-bold transition-all ${photoSubTab === "side" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}>Profil</button>
              <button onClick={() => setPhotoSubTab("back")} className={`py-1.5 rounded-md text-sm font-bold transition-all ${photoSubTab === "back" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}>Dos</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <input type="file" accept="image/*" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900/30 dark:file:text-teal-400 w-full" />
              <Button onClick={handleUploadPhoto} disabled={!file || uploading} className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white font-bold">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "..." : txt.upload}
              </Button>
            </div>

            {beforePhoto && afterPhoto && beforePhoto !== afterPhoto ? (
              <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between text-xs font-bold text-zinc-500 px-4"><span className="text-zinc-800 dark:text-zinc-200">{txt.before}</span><span className="text-teal-600 dark:text-teal-400">{txt.after}</span></div>
                <BeforeAfterSlider before={beforePhoto} after={afterPhoto} />
              </div>
            ) : (
              <div className="py-12 mt-6 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium text-center max-w-xs">{txt.noPhoto}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}