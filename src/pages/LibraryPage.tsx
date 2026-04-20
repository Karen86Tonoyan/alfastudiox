import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, MapPin, Plus, Trash2, User, Mountain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Actor {
  id: string;
  name: string;
  category: string;
  face_prompt: string | null;
  body_type: string | null;
  voice_style: string | null;
  default_style: string | null;
  is_preset: boolean;
}

interface Location {
  id: string;
  name: string;
  category: string;
  scene_prompt: string;
  time_of_day: string | null;
  mood: string | null;
  is_preset: boolean;
}

const ACTOR_PRESETS: Omit<Actor, "id">[] = [
  { name: "Fashion Influencer", category: "fashion", face_prompt: "young stylish female model with confident expression", body_type: "slim athletic", voice_style: "energetic", default_style: "luxury streetwear", is_preset: true },
  { name: "Tech Reviewer", category: "tech", face_prompt: "young male professional with glasses", body_type: "average", voice_style: "informative", default_style: "smart casual", is_preset: true },
  { name: "Fitness Coach", category: "fitness", face_prompt: "athletic person with motivational expression", body_type: "muscular athletic", voice_style: "motivating", default_style: "sportswear", is_preset: true },
  { name: "Gamer Streamer", category: "gaming", face_prompt: "young person with headset and LED lighting", body_type: "average", voice_style: "enthusiastic", default_style: "gaming merch hoodie", is_preset: true },
  { name: "Travel Vlogger", category: "travel", face_prompt: "adventurous person with backpack and sun-kissed skin", body_type: "fit", voice_style: "warm narrative", default_style: "outdoor casual", is_preset: true },
  { name: "Business Executive", category: "business", face_prompt: "professional person in corporate setting", body_type: "tall average", voice_style: "authoritative", default_style: "tailored suit", is_preset: true },
];

const LOCATION_PRESETS: Omit<Location, "id">[] = [
  { name: "Tokyo Neon Night", category: "urban", scene_prompt: "neon-lit Tokyo street at night with rain reflections, cyberpunk atmosphere", time_of_day: "night", mood: "electric", is_preset: true },
  { name: "Paris Golden Hour", category: "urban", scene_prompt: "Parisian street during golden hour, Eiffel Tower in background, warm cinematic light", time_of_day: "golden_hour", mood: "romantic", is_preset: true },
  { name: "Beach Sunset", category: "nature", scene_prompt: "tropical beach at sunset with palm trees, turquoise water, warm orange sky", time_of_day: "sunset", mood: "serene", is_preset: true },
  { name: "Luxury Studio", category: "studio", scene_prompt: "professional photography studio with softbox lighting, clean white backdrop", time_of_day: "controlled", mood: "professional", is_preset: true },
  { name: "Cyberpunk City", category: "fantasy", scene_prompt: "futuristic cyberpunk megacity with holographic ads, flying vehicles, rain", time_of_day: "night", mood: "dystopian", is_preset: true },
  { name: "Mountain Peak", category: "nature", scene_prompt: "dramatic mountain summit above clouds, epic landscape, cinematic wide shot", time_of_day: "sunrise", mood: "epic", is_preset: true },
  { name: "Abandoned Factory", category: "industrial", scene_prompt: "abandoned industrial factory with dramatic lighting through broken windows, dust particles", time_of_day: "day", mood: "gritty", is_preset: true },
  { name: "Rooftop NYC", category: "urban", scene_prompt: "New York City rooftop at twilight, skyline backdrop, urban atmosphere", time_of_day: "twilight", mood: "ambitious", is_preset: true },
];

export default function LibraryPage() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showActorDialog, setShowActorDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  // Form state
  const [newActor, setNewActor] = useState({ name: "", category: "custom", face_prompt: "", body_type: "", voice_style: "", default_style: "" });
  const [newLocation, setNewLocation] = useState({ name: "", category: "custom", scene_prompt: "", time_of_day: "day", mood: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [actorsRes, locationsRes] = await Promise.all([
      supabase.from("ai_actors").select("*").order("is_preset", { ascending: false }),
      supabase.from("ai_locations").select("*").order("is_preset", { ascending: false }),
    ]);

    // Merge presets with DB data
    const dbActors = (actorsRes.data || []) as unknown as Actor[];
    const dbLocations = (locationsRes.data || []) as unknown as Location[];

    // If no presets in DB, show hardcoded presets
    const presetActorNames = new Set(dbActors.filter(a => a.is_preset).map(a => a.name));
    const displayActors = [
      ...ACTOR_PRESETS.filter(p => !presetActorNames.has(p.name)).map((p, i) => ({ ...p, id: `preset-a-${i}` })),
      ...dbActors,
    ];

    const presetLocNames = new Set(dbLocations.filter(l => l.is_preset).map(l => l.name));
    const displayLocations = [
      ...LOCATION_PRESETS.filter(p => !presetLocNames.has(p.name)).map((p, i) => ({ ...p, id: `preset-l-${i}` })),
      ...dbLocations,
    ];

    setActors(displayActors);
    setLocations(displayLocations);
  };

  const addActor = async () => {
    if (!newActor.name.trim()) { toast.error("Podaj nazwę aktora"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("ai_actors").insert({
      user_id: user.id,
      name: newActor.name,
      category: newActor.category || "custom",
      face_prompt: newActor.face_prompt || null,
      body_type: newActor.body_type || null,
      voice_style: newActor.voice_style || null,
      default_style: newActor.default_style || null,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Aktor dodany");
    setShowActorDialog(false);
    setNewActor({ name: "", category: "custom", face_prompt: "", body_type: "", voice_style: "", default_style: "" });
    loadData();
  };

  const addLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.scene_prompt.trim()) { toast.error("Podaj nazwę i opis sceny"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("ai_locations").insert({
      user_id: user.id,
      name: newLocation.name,
      category: newLocation.category || "custom",
      scene_prompt: newLocation.scene_prompt,
      time_of_day: newLocation.time_of_day || "day",
      mood: newLocation.mood || null,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Lokacja dodana");
    setShowLocationDialog(false);
    setNewLocation({ name: "", category: "custom", scene_prompt: "", time_of_day: "day", mood: "" });
    loadData();
  };

  const deleteActor = async (id: string) => {
    if (id.startsWith("preset-")) return;
    await supabase.from("ai_actors").delete().eq("id", id);
    toast.success("Usunięto");
    loadData();
  };

  const deleteLocation = async (id: string) => {
    if (id.startsWith("preset-")) return;
    await supabase.from("ai_locations").delete().eq("id", id);
    toast.success("Usunięto");
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Biblioteka AI</h1>
          <p className="text-xs text-muted-foreground">Aktorzy, lokacje i zasoby do projektów</p>
        </div>
      </div>

      <Tabs defaultValue="actors">
        <TabsList className="bg-secondary h-8">
          <TabsTrigger value="actors" className="text-[10px] gap-1 h-6">
            <User className="h-3 w-3" /> Aktorzy ({actors.length})
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-[10px] gap-1 h-6">
            <MapPin className="h-3 w-3" /> Lokacje ({locations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actors" className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Dialog open={showActorDialog} onOpenChange={setShowActorDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Dodaj aktora</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nowy aktor AI</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Nazwa</Label><Input value={newActor.name} onChange={(e) => setNewActor({ ...newActor, name: e.target.value })} placeholder="np. Cyberpunk Model" /></div>
                  <div><Label className="text-xs">Opis twarzy (prompt)</Label><Textarea value={newActor.face_prompt} onChange={(e) => setNewActor({ ...newActor, face_prompt: e.target.value })} placeholder="np. young woman with sharp features..." /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Typ sylwetki</Label><Input value={newActor.body_type} onChange={(e) => setNewActor({ ...newActor, body_type: e.target.value })} placeholder="slim, athletic..." /></div>
                    <div><Label className="text-xs">Styl domyślny</Label><Input value={newActor.default_style} onChange={(e) => setNewActor({ ...newActor, default_style: e.target.value })} placeholder="streetwear..." /></div>
                  </div>
                  <Button onClick={addActor} className="w-full">Dodaj</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actors.map((actor) => (
              <Card key={actor.id} className="group">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{actor.name}</p>
                      <Badge variant="outline" className="text-[8px] mt-1">{actor.category}</Badge>
                      {actor.is_preset && <Badge className="text-[8px] ml-1 bg-primary/10 text-primary border-primary/20">preset</Badge>}
                    </div>
                    {!actor.is_preset && !actor.id.startsWith("preset-") && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteActor(actor.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {actor.face_prompt && <p className="text-[10px] text-muted-foreground line-clamp-2">{actor.face_prompt}</p>}
                  {actor.default_style && <p className="text-[10px] text-muted-foreground">Styl: {actor.default_style}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locations" className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Dodaj lokację</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nowa lokacja</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Nazwa</Label><Input value={newLocation.name} onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })} placeholder="np. Neon Alley" /></div>
                  <div><Label className="text-xs">Opis sceny (prompt)</Label><Textarea value={newLocation.scene_prompt} onChange={(e) => setNewLocation({ ...newLocation, scene_prompt: e.target.value })} placeholder="dark alley with neon signs..." /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Pora dnia</Label>
                      <Select value={newLocation.time_of_day} onValueChange={(v) => setNewLocation({ ...newLocation, time_of_day: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Dzień</SelectItem>
                          <SelectItem value="night">Noc</SelectItem>
                          <SelectItem value="golden_hour">Golden Hour</SelectItem>
                          <SelectItem value="sunrise">Wschód</SelectItem>
                          <SelectItem value="sunset">Zachód</SelectItem>
                          <SelectItem value="twilight">Zmierzch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Nastrój</Label><Input value={newLocation.mood} onChange={(e) => setNewLocation({ ...newLocation, mood: e.target.value })} placeholder="epic, romantic..." /></div>
                  </div>
                  <Button onClick={addLocation} className="w-full">Dodaj</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="group">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{loc.name}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[8px]">{loc.category}</Badge>
                        {loc.time_of_day && <Badge variant="outline" className="text-[8px]">{loc.time_of_day}</Badge>}
                        {loc.is_preset && <Badge className="text-[8px] bg-primary/10 text-primary border-primary/20">preset</Badge>}
                      </div>
                    </div>
                    {!loc.is_preset && !loc.id.startsWith("preset-") && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteLocation(loc.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{loc.scene_prompt}</p>
                  {loc.mood && <p className="text-[10px] text-muted-foreground">Nastrój: {loc.mood}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
