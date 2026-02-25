import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import alfaLogo from "@/assets/alfa-logo.png";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: "Konto utworzone",
          description: "Sprawdź email, aby potwierdzić rejestrację.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Błąd",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img src={alfaLogo} alt="ALFA by K.Tonoyan" className="h-32 w-auto" />
          <p className="text-sm text-muted-foreground">AI Photo Studio</p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground text-center">
            {isLogin ? "Zaloguj się" : "Utwórz konto"}
          </h2>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gold-gradient text-primary-foreground font-semibold"
          >
            {loading ? "Proszę czekać..." : isLogin ? "Zaloguj się" : "Zarejestruj się"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Nie masz konta?" : "Masz już konto?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Zarejestruj się" : "Zaloguj się"}
            </button>
          </p>
        </form>

        <p className="text-center text-[10px] text-muted-foreground font-mono">
          ALFA by K.Tonoyan © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
