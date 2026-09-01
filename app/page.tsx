import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-zinc-50">
        Masterclass Fitness
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8">
        L'écosystème ultime pour votre recomposition corporelle. 
        Suivi analytique, nutrition et programmes d'entraînement de pointe.
      </p>
      <Link href="/login">
        <Button size="lg" className="font-semibold shadow-md transition-transform hover:scale-105">
          Commencer l'entraînement
        </Button>
      </Link>
    </div>
  );
}