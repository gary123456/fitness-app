"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Globe, Dumbbell, Loader2, CheckCircle2 } from "lucide-react"; 
import { useLanguage } from "@/lib/useLanguage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const { lang, setLang } = useLanguage();

  const t = {
    FR: { email: "Email", pass: "Mot de passe", signin: "Se connecter", signup: "Créer mon compte", toggleToSign: "Pas encore de compte ? S'inscrire", toggleToLog: "Déjà un compte ? Se connecter", subIn: "Connectez-vous à votre écosystème.", subUp: "Créez votre compte pour commencer.", errFill: "Veuillez remplir tous les champs.", success: "Vérifiez vos emails pour confirmer.", redirect: "Connexion réussie..." },
    EN: { email: "Email", pass: "Password", signin: "Sign In", signup: "Create Account", toggleToSign: "No account yet? Sign up", toggleToLog: "Already have an account? Sign in", subIn: "Login to your ecosystem.", subUp: "Create your account to start.", errFill: "Please fill all fields.", success: "Check your emails to confirm.", redirect: "Login successful..." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  // Sécurité PWA : Écouteur d'état global pour garantir que la session est écrite
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSuccessMode(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', session.user.id).single();
        router.refresh();
        router.push(profile ? "/dashboard" : "/onboarding");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!email || !password) { setMessage({ text: txt.errFill, type: "error" }); return; }
    setLoading(true); setMessage({ text: "", type: "" });

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // La redirection est désormais gérée de manière sécurisée par le useEffect (onAuthStateChange)
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: txt.success, type: "success" });
        setIsLoginMode(true); 
        setLoading(false);
      }
    } catch (error: any) { 
      setMessage({ text: error.message, type: "error" }); 
      setLoading(false); 
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 relative overflow-hidden font-sans">
      
      {/* BACKGROUND PREMIUM */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/40 via-zinc-950 to-zinc-950"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-bold bg-zinc-900/50 backdrop-blur-md shadow-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-teal-500/50 transition-all outline-none">
            <Globe className="h-4 w-4" /><span>{lang === "FR" ? "🇫🇷" : "🇬🇧"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100 mt-2 rounded-xl p-2">
            <DropdownMenuItem onClick={() => setLang("FR")} className="font-bold focus:bg-zinc-800 cursor-pointer rounded-lg">🇫🇷 Français</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("EN")} className="font-bold focus:bg-zinc-800 cursor-pointer rounded-lg mt-1">🇬🇧 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md relative z-10 mx-4">
        <div className="bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6 relative">
              <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full"></div>
              <img src="/icon.png" alt="Vivex Logo" className="h-28 w-auto object-contain drop-shadow-2xl relative z-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">VIVEX</h1>
            <p className="text-zinc-400 font-medium text-sm">
              {isLoginMode ? txt.subIn : txt.subUp}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} suppressHydrationWarning className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-400">{txt.email}</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="athlete@vivex.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="pl-12 py-7 text-base bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl focus-visible:ring-1 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-all" 
                  required 
                  disabled={loading || successMode}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">{txt.pass}</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="pl-12 py-7 text-base bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl focus-visible:ring-1 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-all" 
                  required 
                  disabled={loading || successMode}
                />
              </div>
            </div>
            
            {message.text && !successMode && (
              <div className={`p-4 rounded-xl text-sm font-bold text-center border ${message.type === "error" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-teal-500/10 text-teal-400 border-teal-500/20"}`}>
                {message.text}
              </div>
            )}
            
            <div className="pt-2 space-y-4">
              <Button type="submit" className={`w-full py-7 text-lg font-black tracking-wide rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${successMode ? 'bg-teal-600 text-white shadow-[0_0_40px_rgba(20,184,166,0.6)]' : 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-[0_10px_30px_-10px_rgba(20,184,166,0.4)]'}`} disabled={loading || successMode}>
                {successMode ? (
                  <span className="flex items-center justify-center"><CheckCircle2 className="w-6 h-6 mr-2" /> {txt.redirect}</span>
                ) : loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  isLoginMode ? txt.signin : txt.signup
                )}
              </Button>
              
              {!successMode && (
                <button type="button" className="w-full text-sm font-bold text-zinc-500 hover:text-white transition-colors" onClick={() => { setIsLoginMode(!isLoginMode); setMessage({ text: "", type: "" }); }} disabled={loading}>
                  {isLoginMode ? txt.toggleToSign : txt.toggleToLog}
                </button>
              )}
            </div>
          </form>

        </div>
        
        <div className="text-center mt-8 opacity-60">
          <div className="flex items-center justify-center space-x-2 text-zinc-500">
            <Dumbbell className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">Gsextius Consulting LLC</span>
          </div>
        </div>
      </div>
    </div>
  );
}