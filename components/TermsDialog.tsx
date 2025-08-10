'use client';

import React from 'react';
import TermsOfUse from './TermsOfUse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TermsDialogProps {
  children: React.ReactNode;
}

export default function TermsDialog({ children }: TermsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="text-primary hover:underline cursor-pointer transition-colors">
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Terms of Use</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-6 -mr-6">
          <TermsOfUse />
        </div>
      </DialogContent>
    </Dialog>
  );
}
