'use client';

import React from 'react';
import DisclaimerButton from './DisclaimerButton';
import DisclaimerContent from './DisclaimerContent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
      <DialogContent className="sm:max-w-[600px]">
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
