import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiDatePicker } from "./MultiDatePicker";
import { ArrowRight, Users, Calendar } from "lucide-react";

const EVENT_TYPE_OPTIONS = [
  { value: "bedrijfsuitje", label: "Bedrijfsuitje" },
  { value: "teamuitje", label: "Teamuitje / Teambuilding" },
  { value: "heisessie", label: "Heisessie / MT-dag" },
  { value: "incentive", label: "Incentive reis" },
  { value: "zakelijk_evenement", label: "Zakelijk evenement" },
  { value: "bruiloft", label: "Bruiloft" },
  { value: "familieweekend", label: "Familieweekend" },
  { value: "groepsweekend", label: "Groepsweekend" },
  { value: "jubileum", label: "Jubileum" },
  { value: "anders", label: "Anders" },
] as const;

export interface BasicsFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  eventType: string;
  numberOfPeople: number;
  selectedDates: Date[];
}

interface BasicsFormProps {
  onSubmit: (data: BasicsFormData) => void;
}

export const BasicsForm = ({ onSubmit }: BasicsFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [eventType, setEventType] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const handleAddDate = (date: Date): boolean => {
    if (selectedDates.length >= 7) return false;
    const dateStr = date.toDateString();
    if (selectedDates.some(d => d.toDateString() === dateStr)) return false;
    setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    return true;
  };

  const handleRemoveDate = (dateIndex: number) => {
    setSelectedDates(prev => prev.filter((_, i) => i !== dateIndex));
  };

  const isValid = name.trim() && email.trim() && phone.trim() && selectedDates.length > 0 && numberOfPeople >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      eventType,
      numberOfPeople,
      selectedDates,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Begin met de basis
        </h2>
        <p className="text-muted-foreground">
          Vul uw gegevens in, daarna kunt u direct activiteiten toevoegen.
        </p>
      </div>

      {/* Contact details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="basics-name">Naam *</Label>
          <Input
            id="basics-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Uw volledige naam"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="basics-company">Bedrijf / Organisatie</Label>
          <Input
            id="basics-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Naam van uw bedrijf"
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="basics-email">E-mailadres *</Label>
          <Input
            id="basics-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="uw@email.nl"
            maxLength={255}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="basics-phone">Telefoonnummer *</Label>
          <Input
            id="basics-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="06-12345678"
            maxLength={20}
          />
        </div>
      </div>

      {/* Event type */}
      <div className="space-y-2">
        <Label htmlFor="basics-eventType">Type uitje</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger id="basics-eventType">
            <SelectValue placeholder="Selecteer type uitje..." />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Group size */}
      <div className="space-y-2">
        <Label htmlFor="basics-people" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Aantal personen *
        </Label>
        <Input
          id="basics-people"
          type="number"
          min={1}
          max={500}
          value={numberOfPeople}
          onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
          required
          className="w-32"
        />
      </div>

      {/* Dates */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Datum(s) *
        </Label>
        <p className="text-xs text-muted-foreground">
          Selecteer één of meerdere aaneensluitende dagen.
        </p>
        <MultiDatePicker
          selectedDates={selectedDates}
          onAddDate={handleAddDate}
          onRemoveDate={handleRemoveDate}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full gap-2 text-base"
        disabled={!isValid}
      >
        Start uw programma
        <ArrowRight className="h-5 w-5" />
      </Button>
    </form>
  );
};
