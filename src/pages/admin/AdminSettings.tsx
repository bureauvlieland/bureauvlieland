import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  Euro, 
  Percent, 
  Clock, 
  Save, 
  RotateCcw,
  AlertCircle,
  ToggleLeft,
  Bell,
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { SETTING_CATEGORIES } from "@/types/appSettings";
import type { FeeTier, AppSetting } from "@/types/appSettings";
import { formatFeeTierRange } from "@/lib/appSettings";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AdminSettings() {
  const { rawSettings, isLoading, updateSetting, feeTiers } = useAppSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editingTiers, setEditingTiers] = useState<FeeTier[] | null>(null);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Instellingen</h1>
            <p className="text-muted-foreground">
              Beheer applicatie-brede business rules en instellingen
            </p>
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Group settings by category
  const settingsByCategory = rawSettings?.reduce((acc, setting) => {
    const category = setting.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, AppSetting[]>) ?? {};

  const handleEdit = (setting: AppSetting) => {
    setEditingId(setting.id);
    if (setting.id === "coordination_fee_tiers") {
      setEditingTiers(setting.value as FeeTier[]);
    } else {
      setEditValue(String(setting.value));
    }
  };

  const handleSave = async (setting: AppSetting) => {
    let newValue: unknown;
    
    if (setting.id === "coordination_fee_tiers") {
      newValue = editingTiers;
    } else if (setting.value_type === "number") {
      newValue = parseFloat(editValue);
      if (isNaN(newValue as number)) {
        return;
      }
    } else {
      newValue = editValue;
    }

    await updateSetting.mutateAsync({ id: setting.id, value: newValue });
    setEditingId(null);
    setEditingTiers(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
    setEditingTiers(null);
  };

  const handleTierChange = (index: number, field: "maxPeople" | "fee", value: string) => {
    if (!editingTiers) return;
    const newTiers = [...editingTiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: parseInt(value) || 0,
    };
    setEditingTiers(newTiers);
  };

  const renderSettingValue = (setting: AppSetting) => {
    const isEditing = editingId === setting.id;

    // Special handling for fee tiers
    if (setting.id === "coordination_fee_tiers") {
      const tiers = (isEditing ? editingTiers : setting.value) as FeeTier[];
      
      return (
        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-36">
                {formatFeeTierRange(tier, index, tiers)}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span>€</span>
                  <Input
                    type="number"
                    value={tier.fee}
                    onChange={(e) => handleTierChange(index, "fee", e.target.value)}
                    className="w-24"
                  />
                </div>
              ) : (
                <Badge variant="secondary" className="font-mono">
                  €{tier.fee}
                </Badge>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Boolean settings (switches)
    if (setting.value_type === "boolean") {
      const isEnabled = setting.value === true || setting.value === "true";
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              updateSetting.mutate({ id: setting.id, value: checked });
            }}
            disabled={updateSetting.isPending}
          />
          <span className="text-sm text-muted-foreground">
            {isEnabled ? "Ingeschakeld" : "Uitgeschakeld"}
          </span>
        </div>
      );
    }

    // Number or percentage settings
    if (setting.value_type === "number") {
      const isPercentage = setting.category === "vat" || setting.category === "commission";
      
      if (isEditing) {
        return (
          <div className="flex items-center gap-2">
            {!isPercentage && <span>€</span>}
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-32"
            />
            {isPercentage && <span>%</span>}
          </div>
        );
      }

      return (
        <Badge variant="secondary" className="font-mono text-base">
          {isPercentage ? `${setting.value}%` : `€${setting.value}`}
        </Badge>
      );
    }

    // Default text rendering (with edit support)
    if (isEditing) {
      return (
        <Input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="max-w-md"
        />
      );
    }

    return (
      <span className="text-sm">
        {setting.value ? String(setting.value) : <span className="text-muted-foreground italic">— niet ingesteld —</span>}
      </span>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "features":
        return <ToggleLeft className="h-5 w-5" />;
      case "pricing":
        return <Euro className="h-5 w-5" />;
      case "vat":
      case "commission":
        return <Percent className="h-5 w-5" />;
      case "reminders":
        return <Bell className="h-5 w-5" />;
      case "system":
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instellingen</h1>
          <p className="text-muted-foreground">
            Beheer applicatie-brede business rules en instellingen
          </p>
        </div>

        <div className="grid gap-6">
          {Object.entries(SETTING_CATEGORIES).map(([categoryKey, categoryLabel]) => {
            const categorySettings = settingsByCategory[categoryKey] || [];
            if (categorySettings.length === 0) return null;

            return (
              <Card key={categoryKey}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(categoryKey)}
                    {categoryLabel}
                  </CardTitle>
                  <CardDescription>
                    {categoryKey === "features" && "Schakel functies in of uit voor de publieke website"}
                    {categoryKey === "pricing" && "Coördinatiefee staffel gebaseerd op groepsgrootte"}
                    {categoryKey === "vat" && "BTW tarieven voor verschillende diensten"}
                    {categoryKey === "commission" && "Standaard commissie percentages voor partners"}
                    {categoryKey === "reminders" && "Automatische herinnerings-e-mails instellen"}
                    {categoryKey === "system" && "Algemene systeeminstellingen"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categorySettings.map((setting, index) => (
                    <div key={setting.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <Label className="text-base font-medium">
                            {setting.label}
                          </Label>
                          {setting.description && (
                            <p className="text-sm text-muted-foreground">
                              {setting.description}
                            </p>
                          )}
                          <div className="mt-2">
                            {renderSettingValue(setting)}
                          </div>
                          {setting.updated_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Laatst gewijzigd: {format(new Date(setting.updated_at), "EEE d MMM yyyy 'om' HH:mm", { locale: nl })}
                            </p>
                          )}
                        </div>
                        {/* Boolean settings don't need edit button - they use inline switch */}
                        {setting.value_type !== "boolean" && (
                          <div className="flex gap-2">
                            {editingId === setting.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(setting)}
                                  disabled={updateSetting.isPending}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Opslaan
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancel}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Annuleren
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(setting)}
                              >
                                Bewerken
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
