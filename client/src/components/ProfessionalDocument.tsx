import { ReactNode } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProfessionalDocumentProps {
  html: string;
  label?: string;
  onPrint?: () => void;
  toolbarExtra?: ReactNode;
}

/** Renders server-generated letter HTML on a styled “paper” canvas. */
export function ProfessionalDocument({ html, label = 'Document', onPrint, toolbarExtra }: ProfessionalDocumentProps) {
  return (
    <div className="document-shell">
      <div className="document-toolbar">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <FileText className="h-4 w-4 text-brand-primary" />
          {label}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          <Button variant="outline" size="sm" onClick={onPrint || (() => window.print())}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / PDF
          </Button>
        </div>
      </div>
      <div className="document-paper">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
