"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Globe } from "lucide-react"; 
import { useLanguage } from "@/lib/useLanguage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const { lang, setLang } = useLanguage();

  const t = {
    FR: { email: "Email", pass: "Mot de passe", signin: "Se connecter", signup: "Créer mon compte", toggleToSign: "Pas encore de compte ? S'inscrire", toggleToLog: "Déjà un compte ? Se connecter", subIn: "Connectez-vous à votre écosystème.", subUp: "Créez votre compte pour commencer.", errFill: "Veuillez remplir tous les champs.", success: "Vérifiez vos emails pour confirmer." },
    EN: { email: "Email", pass: "Password", signin: "Sign In", signup: "Create Account", toggleToSign: "No account yet? Sign up", toggleToLog: "Already have an account? Sign in", subIn: "Login to your ecosystem.", subUp: "Create your account to start.", errFill: "Please fill all fields.", success: "Check your emails to confirm." }
  };
  const txt = t[lang as keyof typeof t] || t.FR;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!email || !password) { setMessage({ text: txt.errFill, type: "error" }); return; }
    setLoading(true); setMessage({ text: "", type: "" });

    try {
      if (isLoginMode) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (authData.user) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('id', authData.user.id).single();
          window.location.href = profile ? "/dashboard" : "/onboarding";
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: txt.success, type: "success" });
        setIsLoginMode(true); 
      }
    } catch (error: any) { setMessage({ text: error.message, type: "error" }); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950 relative">
      
      {/* SÉLECTEUR DE LANGUE */}
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-bold bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
            <Globe className="h-4 w-4" /><span>{lang === "FR" ? "🇫🇷" : "🇬🇧"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-950">
            <DropdownMenuItem onClick={() => setLang("FR")} className="font-bold">🇫🇷 Français</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("EN")} className="font-bold">🇬🇧 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center mb-2 mt-4">
            {/* LOGO GÉANT ICI */}
            <img src="/logo.png" alt="Vivex Logo" className="h-40 w-auto object-contain drop-shadow-md" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Vivex Fitness</CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 font-medium">
            {isLoginMode ? txt.subIn : txt.subUp}
          </CardDescription>
        </CardHeader>
        
<form onSubmit={handleSubmit} suppressHydrationWarning>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="font-semibold text-zinc-700 dark:text-zinc-300">{txt.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                <Input id="email" type="email" placeholder="athlete@vivex.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 py-6 text-md bg-zinc-50 dark:bg-zinc-950/50" required suppressHydrationWarning />
              </div>
            </div>
            
            <div className="space-y-2 text-left">
              <Label htmlFor="password" className="font-semibold text-zinc-700 dark:text-zinc-300">{txt.pass}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 py-6 text-md bg-zinc-50 dark:bg-zinc-950/50" required suppressHydrationWarning />
              </div>
            </div>
            
            {message.text && (
              <div className={`p-3 rounded-md text-sm font-semibold text-center border ${message.type === "error" ? "bg-red-50 text-red-600 border-red-200" : "bg-teal-50 text-teal-600 border-teal-200"}`}>
                {message.text}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3 pt-4">
            <Button type="submit" className="w-full py-6 text-lg font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]" disabled={loading}>
              {loading ? "..." : isLoginMode ? txt.signin : txt.signup}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-zinc-500 hover:text-teal-600" onClick={() => { setIsLoginMode(!isLoginMode); setMessage({ text: "", type: "" }); }} disabled={loading}>
              {isLoginMode ? txt.toggleToSign : txt.toggleToLog}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}