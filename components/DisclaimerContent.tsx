import React from 'react';
import TermsDialog from './TermsDialog';
import PrivacyDialog from './PrivacyDialog';

interface DisclaimerContentProps {
  disclaimerText?: string;
}

export default function DisclaimerContent({
  disclaimerText,
}: DisclaimerContentProps) {
  const defaultDisclaimer = `
⚠️ StudioBrain is in Early Access
This is a pre-release version of StudioBrain and may contain bugs or inaccuracies. Please use it for testing and feedback purposes only.

💡 AI-Generated Content
StudioBrain uses OpenAI to assist with music theory, production advice, and practice tools. All output is for informational and educational purposes only and should not be considered professional instruction. Always use your own judgment when applying suggestions.

🎓 Educational Use Only
• Individual results may vary based on personal practice and skill level
• AI-generated suggestions should be used as guidance, not absolute rules
• Always consult with qualified music teachers for personalized instruction
• Practice safely and take breaks to avoid repetitive strain injuries

⚖️ Legal Notice
By using StudioBrain, you acknowledge that:
• You use the information and suggestions at your own discretion and risk
• The developers are not liable for any damages or injuries resulting from use
• You agree to the Terms of Use and Privacy Policy

📌 Support & Feedback
As this is an early access version, your feedback helps improve the application. Report issues or suggestions through the appropriate channels.
  `.trim();

  const textToDisplay = disclaimerText || defaultDisclaimer;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {textToDisplay}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-6 border-t border-border">
        <div className="text-xs text-muted-foreground/70 text-center">
          © 2025 StudioBrain | <TermsDialog>Terms of Use</TermsDialog> |{' '}
          <PrivacyDialog>Privacy Policy</PrivacyDialog>
        </div>
      </div>
    </div>
  );
}
