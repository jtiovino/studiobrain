'use client';

import React from 'react';
import PrivacyPolicy from './PrivacyPolicy';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PrivacyDialogProps {
  children: React.ReactNode;
}

export default function PrivacyDialog({ children }: PrivacyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="text-primary hover:underline cursor-pointer transition-colors">
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-6 -mr-6">
          <PrivacyPolicy />
        </div>
      </DialogContent>
    </Dialog>
  );
}
