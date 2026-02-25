import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, TrendingDown, Gift, LogOut, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Profile {
  credit_balance: number;
  is_promo_customer: boolean;
  email: string | null;
  display_name: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const DashboardPage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, txRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("credit_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (txRes.data) setTransactions(txRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "purchase": return <TrendingUp className="h-4 w-4 text-[hsl(var(--status-ok))]" />;
      case "usage": return <TrendingDown className="h-4 w-4 text-[hsl(var(--status-danger))]" />;
      case "promo": return <Gift className="h-4 w-4 text-primary" />;
      default: return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "purchase": return "Zakup";
      case "usage": return "Użycie";
      case "promo": return "Promocja";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.display_name || profile?.email || "Klient ALFA"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Wyloguj
        </Button>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Credit Balance */}
        <Card className="border-primary/20 gold-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo kredytów</CardTitle>
            <Coins className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gold-text">{profile?.credit_balance ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">dostępnych kredytów</p>
          </CardContent>
        </Card>

        {/* Promo Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <Crown className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {profile?.is_promo_customer ? (
              <Badge className="gold-gradient text-primary-foreground">Klient Promo</Badge>
            ) : (
              <Badge variant="secondary">Standard</Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {profile?.is_promo_customer
                ? "Korzystasz z oferty promocyjnej"
                : "Standardowy plan cenowy"}
            </p>
          </CardContent>
        </Card>

        {/* Transactions Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transakcje</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">łącznie operacji</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historia transakcji</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Brak transakcji. Zakup kredyty, aby rozpocząć pracę.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {typeIcon(tx.type)}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {tx.description || typeLabel(tx.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "dd.MM.yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono font-semibold ${
                      tx.amount > 0 ? "text-[hsl(var(--status-ok))]" : "text-[hsl(var(--status-danger))]"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
