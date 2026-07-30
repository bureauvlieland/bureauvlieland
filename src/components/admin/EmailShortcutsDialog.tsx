import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "j / ↓", label: "Volgend gesprek" },
  { keys: "k / ↑", label: "Vorig gesprek" },
  { keys: "Enter", label: "Gesprek openen" },
  { keys: "Esc", label: "Terug naar de lijst" },
  { keys: "r", label: "Beantwoorden" },
  { keys: "e", label: "Gesprek archiveren / terughalen" },
  { keys: "m", label: "Markeer als beantwoord" },
  { keys: "u", label: "Markeer als onbeantwoord" },
  { keys: "a", label: "Archief tonen aan/uit" },
  { keys: "?", label: "Dit overzicht" },
];

export function EmailShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sneltoetsen</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[11px] font-mono">{s.keys}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Sneltoetsen werken zolang je niet in een tekstveld typt.
        </p>
      </DialogContent>
    </Dialog>
  );
}
