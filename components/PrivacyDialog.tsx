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
      <DialogContent className="sm:max-w-[700px] sm:justify-center">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto sm:overflow-visible sm:pr-6 sm:-mr-6">
          <PrivacyPolicy />
        </div>
      </DialogContent>
    </Dialog>
  );
}
