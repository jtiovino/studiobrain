'use client';

import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import DisclaimerButton from './DisclaimerButton';
import DisclaimerContent from './DisclaimerContent';

interface DisclaimerDialogProps {
  disclaimerText?: string;
}

export default function DisclaimerDialog({
  disclaimerText,
}: DisclaimerDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div>
          <DisclaimerButton onDisclaimerClick={() => {}} />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] sm:justify-center">
        <DialogHeader>
          <DialogTitle>Legal Disclaimer</DialogTitle>
          <DialogDescription>
            Important information about using this application
          </DialogDescription>
        </DialogHeader>
        <DisclaimerContent disclaimerText={disclaimerText} />
      </DialogContent>
    </Dialog>
  );
}
